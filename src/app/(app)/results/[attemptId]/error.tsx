"use client";
import { LearnerRouteError } from "@/components/practice/learner-progress-pages";
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <LearnerRouteError reset={reset} />; }
