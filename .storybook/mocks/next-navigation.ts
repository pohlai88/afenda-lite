/** Storybook stub — avoids next/navigation server bundles in Vite. */
export function usePathname() {
  return "/dashboard";
}

export function useRouter() {
  return {
    push: () => undefined,
    replace: () => undefined,
    refresh: () => undefined,
    back: () => undefined,
    forward: () => undefined,
    prefetch: async () => undefined,
  };
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useParams() {
  return {};
}

export function redirect() {
  return undefined;
}

export function notFound() {
  return undefined;
}
