import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();
  
  if (!userId) {
    return redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Welcome to Dodo Dev!</h1>
        <p className="text-muted-foreground">
          This is your home page. You successfully completed onboarding!
        </p>
        
        {/* Add your home page content here */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Join Communities</h3>
              <p className="text-sm text-muted-foreground">Connect with developers in your field</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Share Projects</h3>
              <p className="text-sm text-muted-foreground">Showcase your work to the community</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Ask Questions</h3>
              <p className="text-sm text-muted-foreground">Get help from experienced developers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}