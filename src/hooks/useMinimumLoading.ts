import { useEffect, useState } from "react";

const useMinimumLoading = (isLoading: boolean = true) => {
  const [showLoading, setShowLoading] = useState(isLoading);
  if (isLoading && !showLoading) setShowLoading(true);
  useEffect(() => {
    if (isLoading || !showLoading) return;
    const timeout = window.setTimeout(() => setShowLoading(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [isLoading, showLoading]);
  return showLoading;
};

export default useMinimumLoading;
