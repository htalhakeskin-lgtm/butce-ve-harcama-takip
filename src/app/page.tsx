import { redirect } from "next/navigation";

import { getSessionUser } from "@/server/context";

export default async function Home() {
  redirect((await getSessionUser()) ? "/dashboard" : "/login");
}
