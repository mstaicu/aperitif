// import { redirect } from "remix";
// import type { ActionFunction, LoaderFunction } from "remix";

// import { getSession, destroySession } from "~/utils/session.server";

// export let action: ActionFunction = async ({ request }) => {
//   let session = await getSession(request.headers.get("Cookie"));

//   throw redirect("/login", {
//     headers: {
//       "Set-Cookie": await destroySession(session),
//     },
//   });
// };
// export let loader: LoaderFunction = async () => redirect("/login");
