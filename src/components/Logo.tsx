import Image from "next/image";

export default function Logo({
  className = "h-6 w-auto",
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <Image
      src="/heyfreak-logo-mark.png"
      alt="Heyfreak"
      width={398}
      height={121}
      className={`${className} ${invert ? "invert" : ""}`}
    />
  );
}
