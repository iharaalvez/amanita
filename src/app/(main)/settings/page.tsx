import { Bell, Database, Shield } from "lucide-react";

const settings = [
  {
    title: "Account",
    description: "Profile, session, and sync preferences.",
    Icon: Shield,
  },
  {
    title: "Data",
    description: "Backup, import, and local storage controls.",
    Icon: Database,
  },
  {
    title: "Notifications",
    description: "Milestones and reminder preferences.",
    Icon: Bell,
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-10">
      <div className="mb-5">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <Shield className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Account and app preferences.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {settings.map(({ title, description, Icon }) => (
          <article
            key={title}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-black text-gray-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
