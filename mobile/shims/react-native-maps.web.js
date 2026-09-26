import React from "react";
import { View, Text, StyleSheet } from "react-native";

function MapView({ style, children, ...props }) {
  return (
    <View style={[styles.map, style]}>
      <Text style={styles.text}>Map (mobile only)</Text>
      {children}
    </View>
  );
}

function Marker({ children }) {
  return null;
}

MapView.Marker = Marker;

const PROVIDER_DEFAULT = null;
const PROVIDER_GOOGLE = "google";

export { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE };
export default MapView;

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: "#E8F0E9",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    color: "#6B8A94",
    fontFamily: "Inter_500Medium",
  },
});
