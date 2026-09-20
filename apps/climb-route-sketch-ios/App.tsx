import Slider from "@react-native-community/slider";
import { Asset as ExpoAsset } from "expo-asset";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  type GestureResponderEvent,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { extractHolds, hsvToRgb, type RGB, rgbToHsv } from "./src/lib/extract";
import { loadRaster, type RasterImage } from "./src/lib/raster";
import { closedSmoothPath, openSmoothPath } from "./src/lib/svgPaths";
import { detectWallLines } from "./src/lib/wallLines";

const PAPER = "#faf7f1";
const INK = "#1c1917"; // stone-900
const MUTED = "#57534e"; // stone-600
const LINE_COLOR = "rgba(148, 131, 109, 0.6)";

function rgbCss({ r, g, b }: RGB): string {
  return `rgb(${r},${g},${b})`;
}

/** Flat poster color derived from the picked pixel (chalk desaturates holds). */
function posterColor(target: RGB): RGB {
  const { h, s, v } = rgbToHsv(target.r, target.g, target.b);
  return hsvToRgb(h, Math.max(s, 0.55), Math.min(Math.max(v, 0.55), 0.92));
}

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    // Alert.alert is a no-op on react-native-web.
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function App() {
  const [raster, setRaster] = useState<RasterImage | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [target, setTarget] = useState<RGB | null>(null);
  const [pickedAt, setPickedAt] = useState<[number, number] | null>(null);
  const [hueTolerance, setHueTolerance] = useState(14);
  const [shadeTolerance, setShadeTolerance] = useState(0.55);
  const [minSize, setMinSize] = useState(1.2);
  const [showWallLines, setShowWallLines] = useState(true);
  const [lineDetail, setLineDetail] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [photoW, setPhotoW] = useState(0);
  const [sketchW, setSketchW] = useState(0);

  const sketchRef = useRef<View>(null);

  const loadImage = async (uri: string, width: number, height: number) => {
    setBusy(true);
    try {
      const img = await loadRaster(uri, width, height);
      setRaster(img);
      setPhotoUri(uri);
      setTarget(null);
      setPickedAt(null);
    } catch (err) {
      notify("Could not load photo", String(err));
    } finally {
      setBusy(false);
    }
  };

  const loadSample = async () => {
    setBusy(true);
    try {
      const asset = ExpoAsset.fromModule(require("./assets/sample-wall.jpg"));
      await asset.downloadAsync();
      await loadImage(
        asset.localUri ?? asset.uri,
        asset.width ?? 1600,
        asset.height ?? 2133,
      );
    } catch (err) {
      notify("Could not load sample", String(err));
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    await loadImage(asset.uri, asset.width, asset.height);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      notify("Camera unavailable", "Camera permission was not granted.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    await loadImage(asset.uri, asset.width, asset.height);
  };

  const onPickColor = (e: GestureResponderEvent) => {
    if (!raster || photoW === 0) return;
    const scale = raster.width / photoW;
    const x = Math.round(e.nativeEvent.locationX * scale);
    const y = Math.round(e.nativeEvent.locationY * scale);
    // Average a 5x5 patch so a single noisy pixel doesn't skew the pick.
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || px >= raster.width || py < 0 || py >= raster.height) {
          continue;
        }
        const i = (py * raster.width + px) * 4;
        r += raster.data[i];
        g += raster.data[i + 1];
        b += raster.data[i + 2];
        n++;
      }
    }
    if (n === 0) return;
    setTarget({
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n),
    });
    setPickedAt([x, y]);
  };

  const shapes = useMemo(() => {
    if (!raster || !target) return null;
    return extractHolds(raster, {
      target,
      hueTolerance,
      shadeTolerance,
      minAreaFraction: (minSize / 10000) * 0.6,
    });
  }, [raster, target, hueTolerance, shadeTolerance, minSize]);
  const holdCount = shapes ? shapes.length : null;

  const wallLines = useMemo(() => {
    if (!raster || !showWallLines) return null;
    return detectWallLines(raster, { detail: lineDetail });
  }, [raster, showWallLines, lineDetail]);

  const fill = target ? rgbCss(posterColor(target)) : INK;

  const captureSketch = async (): Promise<string | null> => {
    if (!sketchRef.current) return null;
    return captureRef(sketchRef, {
      format: "png",
      quality: 1,
      result: Platform.OS === "web" ? "data-uri" : "tmpfile",
    });
  };

  const saveSketch = async () => {
    try {
      const uri = await captureSketch();
      if (!uri) return;
      if (Platform.OS === "web") {
        const a = document.createElement("a");
        a.href = uri;
        a.download = "route-sketch.png";
        a.click();
        return;
      }
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        notify("Cannot save", "Photo library permission was not granted.");
        return;
      }
      await MediaLibrary.Asset.create(uri);
      notify("Saved", "Sketch saved to your photo library.");
    } catch (err) {
      notify("Save failed", String(err));
    }
  };

  const shareSketch = async () => {
    try {
      const uri = await captureSketch();
      if (!uri) return;
      if (!(await Sharing.isAvailableAsync())) {
        notify("Sharing unavailable", "Use Save PNG instead.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch (err) {
      notify("Share failed", String(err));
    }
  };

  const photoH = raster && photoW > 0 ? (photoW * raster.height) / raster.width : 0;
  const sketchH =
    raster && sketchW > 0 ? (sketchW * raster.height) / raster.width : 0;
  const dispScale = raster && photoW > 0 ? photoW / raster.width : 1;
  const markerR = Math.max(10, photoW * 0.018);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Climb Route Sketch</Text>
        <Text style={styles.subtitle}>
          Turn a wall photo into an abstract map of one route&apos;s holds.
          Everything runs on your device.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>1 · Photo</Text>
            <View style={styles.row}>
              {Platform.OS !== "web" && (
                <Btn label="Camera" onPress={takePhoto} />
              )}
              <Btn label="Library" onPress={pickFromLibrary} />
              <Btn label="Sample" secondary onPress={loadSample} />
            </View>
          </View>
          <Text style={styles.hint}>
            {raster
              ? "Tap a hold to pick the route color."
              : busy
                ? "Loading photo…"
                : "Take or choose a wall photo, or load the sample."}
          </Text>
          {busy && <ActivityIndicator style={styles.spinner} color={INK} />}
          {raster && photoUri && (
            <Pressable
              onPress={onPickColor}
              onLayout={(e) => setPhotoW(e.nativeEvent.layout.width)}
              style={styles.photoWrap}
            >
              <Image
                source={{ uri: photoUri }}
                style={{ width: "100%", height: photoH, borderRadius: 12 }}
                resizeMode="cover"
              />
              {pickedAt && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.marker,
                    {
                      left: pickedAt[0] * dispScale - markerR,
                      top: pickedAt[1] * dispScale - markerR,
                      width: markerR * 2,
                      height: markerR * 2,
                      borderRadius: markerR,
                    },
                  ]}
                />
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>2 · Route color</Text>
            {target ? (
              <View style={styles.row}>
                <View
                  style={[styles.swatch, { backgroundColor: rgbCss(target) }]}
                />
                <Text style={styles.hint}>picked</Text>
              </View>
            ) : (
              <Text style={styles.hintFaint}>not picked yet</Text>
            )}
          </View>
          <LabeledSlider
            label="Hue tolerance"
            value={hueTolerance}
            min={4}
            max={40}
            step={1}
            format={(v) => `±${Math.round(v)}°`}
            onCommit={setHueTolerance}
          />
          <LabeledSlider
            label="Shade tolerance (chalk & shadows)"
            value={shadeTolerance}
            min={0.2}
            max={0.9}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onCommit={setShadeTolerance}
          />
          <LabeledSlider
            label="Minimum hold size"
            value={minSize}
            min={0.2}
            max={4}
            step={0.1}
            format={(v) => v.toFixed(1)}
            onCommit={setMinSize}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>3 · Sketch</Text>
            <View style={styles.row}>
              <Btn
                label="Save PNG"
                onPress={saveSketch}
                disabled={!target && !wallLines}
              />
              {Platform.OS !== "web" && (
                <Btn label="Share" secondary onPress={shareSketch} />
              )}
            </View>
          </View>
          <View style={styles.toggleRow}>
            <Switch
              value={showWallLines}
              onValueChange={setShowWallLines}
              trackColor={{ true: INK }}
              thumbColor="#fff"
            />
            <Text style={styles.hint}>
              Show wall lines (seams, volumes, plane breaks)
            </Text>
          </View>
          {showWallLines && (
            <LabeledSlider
              label="Wall line detail"
              value={lineDetail}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onCommit={setLineDetail}
            />
          )}
          <Text style={styles.hint}>
            {holdCount === null
              ? "Pick a color above to draw the route."
              : `${holdCount} hold${holdCount === 1 ? "" : "s"} found.`}
          </Text>
          {raster && (
            <View
              onLayout={(e) => setSketchW(e.nativeEvent.layout.width)}
              style={styles.sketchWrap}
            >
              <View
                ref={sketchRef}
                collapsable={false}
                style={{ backgroundColor: PAPER }}
              >
                <Svg
                  width="100%"
                  height={sketchH}
                  viewBox={`0 0 ${raster.width} ${raster.height}`}
                >
                  {wallLines?.map((line, i) => (
                    <Path
                      key={`l${i}`}
                      d={openSmoothPath(line)}
                      stroke={LINE_COLOR}
                      strokeWidth={Math.max(2, raster.width * 0.003)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                  {shapes?.map((shape, i) => (
                    <Path
                      key={`h${i}`}
                      d={closedSmoothPath(shape.contour)}
                      fill={fill}
                      stroke={fill}
                      strokeWidth={3}
                      strokeLinejoin="round"
                    />
                  ))}
                </Svg>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          No photos leave your device — all processing is local.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Btn({
  label,
  onPress,
  secondary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        secondary && styles.btnSecondary,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
      ]}
    >
      <Text style={[styles.btnText, secondary && styles.btnTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onCommit: (v: number) => void;
}) {
  const [live, setLive] = useState(value);
  useEffect(() => setLive(value), [value]);
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderLabels}>
        <Text style={styles.hint}>{label}</Text>
        <Text style={styles.hint}>{format(live)}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={setLive}
        onSlidingComplete={onCommit}
        minimumTrackTintColor={INK}
        maximumTrackTintColor="#d6d3d1"
        thumbTintColor={INK}
        style={styles.slider}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f4" },
  container: {
    padding: 16,
    paddingTop: 24,
    gap: 14,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  title: { fontSize: 26, fontWeight: "700", color: INK },
  subtitle: { fontSize: 14, color: MUTED, marginTop: -8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e5e4",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: INK },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  hint: { fontSize: 13, color: MUTED, flexShrink: 1 },
  hintFaint: { fontSize: 13, color: "#a8a29e" },
  spinner: { marginVertical: 8 },
  photoWrap: { width: "100%" },
  marker: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d6d3d1",
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sliderBlock: { gap: 2 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between" },
  slider: { width: "100%", height: 32 },
  sketchWrap: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e5e4",
  },
  btn: {
    backgroundColor: INK,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  btnSecondary: { backgroundColor: "#e7e5e4" },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  btnTextSecondary: { color: INK },
  footer: {
    fontSize: 12,
    color: "#a8a29e",
    textAlign: "center",
    paddingBottom: 16,
  },
});
