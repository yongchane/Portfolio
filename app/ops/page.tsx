import AdminConsole from "@/components/AdminConsole";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Ops Console",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OpsPage() {
  const authenticated = await isOpsAuthenticated();
  const data = authenticated ? await getOpsConsoleData() : null;

  return <AdminConsole authenticated={authenticated} data={data} />;
}
