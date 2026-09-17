export type MascotPose = "idle" | "loading" | "success" | "empty";

const SIZE_CLASSES: Record<string, string> = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
};

export default function Mascot({
  pose = "idle",
  size = "md",
  className = "",
}: {
  pose?: MascotPose;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const poseClass =
    pose === "loading" ? "mascot-head-loading" : pose === "success" ? "mascot-body-success" : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/raven-mascot.png"
      alt={`Raven mascot, ${pose}`}
      className={`${SIZE_CLASSES[size]} object-contain ${poseClass ?? ""} ${className}`}
    />
  );
}
