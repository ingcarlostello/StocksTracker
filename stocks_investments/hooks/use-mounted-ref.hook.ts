import { useEffect, useRef } from "react";

// true while the component is mounted; lets an awaited action skip side effects (like navigating) after the user left.
export function useMountedRef() {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}
