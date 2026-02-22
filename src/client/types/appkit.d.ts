import type {} from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "appkit-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          size?: "sm" | "md" | "lg";
          label?: string;
          balance?: "show" | "hide";
          disabled?: boolean;
        },
        HTMLElement
      >;
      "appkit-account-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          balance?: "show" | "hide";
          disabled?: boolean;
        },
        HTMLElement
      >;
      "appkit-connect-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          size?: "sm" | "md" | "lg";
          label?: string;
        },
        HTMLElement
      >;
      "appkit-network-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          disabled?: boolean;
        },
        HTMLElement
      >;
    }
  }
}
