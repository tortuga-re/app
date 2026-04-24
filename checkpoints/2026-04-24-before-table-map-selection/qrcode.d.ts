declare module "qrcode" {
  export interface QRCodeToStringOptions {
    type?: "svg" | "terminal" | "utf8";
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toString(
    text: string,
    options?: QRCodeToStringOptions,
  ): Promise<string>;
}
