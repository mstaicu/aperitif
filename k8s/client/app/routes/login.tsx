import { Form, useActionData, useSearchParams, useTransition } from "remix";
import type { LinksFunction } from "remix";

export {
  loginAction as action,
  loginLoader as loader,
} from "~/utils/auth.server";

export default () => (
  <Form method="post">
    <fieldset>
      <input
        aria-label="Email address"
        aria-describedby="email-state"
        type="email"
        name="email"
        placeholder="Enter your email address"
      />

      <input type="hidden" name="landingPage" value="/" />
    </fieldset>

    <button>Submit</button>
  </Form>
);

// export let links: LinksFunction = () => [
//   { rel: "stylesheet", href: loginStylesUrl },
// ];

// export default () => {
//   let [searchParams] = useSearchParams();
//   let transition = useTransition();

//   let actionData = useActionData();

//   let state: "idle" | "submitting" | "error" = transition.submission
//     ? "submitting"
//     : actionData?.errors
//     ? "error"
//     : "idle";

//   let mounted = useRef<boolean>();

//   let emailRef = useRef<HTMLInputElement>(null);
//   let passwordRef = useRef<HTMLInputElement>(null);

//   useEffect(() => {
//     if (state === "error" && actionData?.errors.invalid_params?.email) {
//       emailRef.current?.focus();
//     }

//     if (
//       state === "error" &&
//       actionData?.errors.invalid_params?.password &&
//       !actionData?.errors.invalid_params?.email
//     ) {
//       passwordRef.current?.focus();
//     }

//     if (state === "idle" && mounted.current) {
//       emailRef.current?.select();
//     }

//     mounted.current = true;
//   }, [state]);

//   return (
//     <main>
//       <Form replace method="post">
//         <h2>Login or Register?</h2>

//         <fieldset disabled={state === "submitting"}>
//           <label>
//             <input
//               type="radio"
//               name="loginType"
//               value="login"
//               defaultChecked={
//                 !actionData?.values.loginType ||
//                 actionData?.values.loginType === "login"
//               }
//             />
//             Login
//           </label>

//           <label>
//             <input
//               type="radio"
//               name="loginType"
//               value="register"
//               defaultChecked={actionData?.values.loginType === "register"}
//             />
//             Register
//           </label>
//         </fieldset>

//         <fieldset disabled={state === "submitting"}>
//           <input
//             ref={emailRef}
//             aria-label="Email address"
//             aria-describedby="email-state"
//             type="email"
//             name="email"
//             placeholder="Enter your email address"
//           />
//           <input
//             ref={passwordRef}
//             aria-label="Password field"
//             aria-describedby="password-state"
//             type="password"
//             name="password"
//             placeholder="Enter your password"
//           />

// <input
//   type="hidden"
//   name="redirectTo"
//   value={searchParams.get("redirectTo") ?? "/"}
// />

//           <button>{state === "submitting" ? "Submitting" : "Submit"}</button>
//         </fieldset>

//         <p id="email-state">
//           {state === "error" && actionData?.errors.invalid_params?.email ? (
//             actionData?.errors.invalid_params?.email
//           ) : (
//             <>&nbsp;</>
//           )}
//         </p>

//         <p id="password-state">
//           {state === "error" && actionData?.errors.invalid_params?.password ? (
//             actionData?.errors.invalid_params?.password
//           ) : (
//             <>&nbsp;</>
//           )}
//         </p>
//       </Form>
//     </main>
//   );
// };
