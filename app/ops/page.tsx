import AdminConsole from "@/components/AdminConsole";
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
  const data = await getOpsConsoleData();

  return <AdminConsole data={data} />;
}
