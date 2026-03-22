import { Fragment, type PropsWithChildren, type ReactNode, useEffect } from "react";
import type { ComponentType } from "react";
import { initializeAuthListener, useAuthStore } from "./authStore";

export type ProviderComponent = ComponentType<{ children: ReactNode }>;

export interface SharedBootProvidersProps {
  /**
   * Optional provider components that should wrap the application (e.g. SafeAreaProvider, ThemeProvider).
   * Providers are applied in order, with the last item closest to the children.
   */
  providers?: ProviderComponent[];
}

function wrapWithProviders(children: ReactNode, providers: ProviderComponent[]) {
  return providers.reduceRight(
    (acc, Provider) => (
      <Provider>
        {acc}
      </Provider>
    ),
    children
  );
}

export function SharedBootProviders({ providers = [], children }: PropsWithChildren<SharedBootProvidersProps>) {
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    try {
      cleanup = initializeAuthListener();
    } catch (error) {
      console.error("Failed to initialize auth listener:", error);
      useAuthStore.getState().setLoading(false);
    }

    return () => {
      cleanup?.();
    };
  }, []);

  if (providers.length === 0) {
    return <Fragment>{children}</Fragment>;
  }

  return <Fragment>{wrapWithProviders(children, providers)}</Fragment>;
}
