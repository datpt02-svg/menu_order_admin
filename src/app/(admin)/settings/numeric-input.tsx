"use client";

import { Input } from "@/components/ui/field";

type NumericInputProps = Omit<React.ComponentProps<typeof Input>, "onInput">;

function keepDigits(value: string) {
  return value.replace(/\D+/g, "");
}

export function NumericInput(props: NumericInputProps) {
  return (
    <Input
      {...props}
      onInput={(event) => {
        event.currentTarget.value = keepDigits(event.currentTarget.value);
      }}
    />
  );
}
