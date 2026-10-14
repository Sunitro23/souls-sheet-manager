import manifest from "../../public/owlbear/manifest.json";

export function GET() {
  return Response.json(manifest, {
    headers: {
      "Access-Control-Allow-Origin": "https://www.owlbear.rodeo",
      "Cache-Control": "no-cache",
    },
  });
}
