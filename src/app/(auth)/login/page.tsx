"use client";

import * as React from "react";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import LoginPageContent from "./login-content";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
