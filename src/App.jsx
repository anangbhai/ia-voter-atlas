import { Analytics } from "@vercel/analytics/react";
import IndianAmericanVoterAtlas from "./indian-american-voter-atlas";

export default function App() {
  return (
    <>
      <IndianAmericanVoterAtlas />
      <Analytics />
    </>
  );
}
