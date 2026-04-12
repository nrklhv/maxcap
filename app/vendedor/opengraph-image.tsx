import { ImageResponse } from "next/og";

export const alt = "MaxRent — liquidez para tu propiedad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function VendedorOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#001F30",
          padding: 72,
        }}
      >
        <div
          style={{
            fontSize: 76,
            fontWeight: 400,
            color: "#FBF7F3",
            letterSpacing: "-0.02em",
            fontFamily: "Georgia, serif",
          }}
        >
          MaxRent
        </div>
        <div
          style={{
            fontSize: 40,
            color: "#C4B8AE",
            marginTop: 28,
            maxWidth: 920,
            lineHeight: 1.25,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Le damos liquidez a tu propiedad
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 22,
            color: "#5DCAA5",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 600,
          }}
        >
          Vendedores · Chile
        </div>
      </div>
    ),
    { ...size },
  );
}
