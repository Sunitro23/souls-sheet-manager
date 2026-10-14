const retired = () => Response.json({ error: "API retirée. Utilisez l’application Souls et son extension intégrée." }, { status: 410 });
export const GET = retired;
export const POST = retired;
