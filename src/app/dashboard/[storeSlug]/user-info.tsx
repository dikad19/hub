import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserInfo({ name, email }: { name: string; email: string }) {
  return (
    <div className="ml-auto flex items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
      <Avatar className="size-8">
        <AvatarFallback className="text-xs font-medium">
          {getInitials(name) || "U"}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
