import type { LoaderFunction } from "remix";
import { useLoaderData } from "remix";

type LoaderData = {
  joke: { id: string | undefined; name: string; content: string };
};

export let loader: LoaderFunction = async ({ params }) => {
  let joke = {
    id: params.jokeId,
    name: "what",
    content: "hello!",
  };

  // if (joke) {
  //   throw new Error("Joke not found");
  // }

  let data: LoaderData = {
    joke,
  };

  return data;
};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>
        Why don't you find hippopotamuses hiding in trees? They're really good
        at it.
      </p>

      <p>{data.joke.content}</p>
    </div>
  );
}
