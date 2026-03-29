import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { getAccessToken } from "@/services/api";

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    getAccessToken().then((token) => {
      setHasToken(!!token);
      setChecked(true);
    });
  }, []);

  if (!checked) return null;
  return <Redirect href={hasToken ? "/(tabs)" : "/auth"} />;
}
