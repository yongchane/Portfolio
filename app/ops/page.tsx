import AdminConsole from "@/components/AdminConsole";

export const metadata = {
  title: "Ops Console",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OpsPage() {
  return <AdminConsole />;
}
