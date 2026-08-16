import styles from "./input-otp.module.css";
import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";

import { cn } from "#/lib/utils.ts";
import { MinusIcon } from "lucide-react";

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        styles["input-otp-container-name"],
        containerClassName,
      )}
      spellCheck={false}
      className={cn(styles["input-otp"], className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        styles["input-otpgroup"],
        className,
      )}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        styles["input-otpslot-relative"],
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className={styles["input-otpslot-pointer"]}>
          <div className={styles["input-otpslot-h"]} />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className={styles["input-otpseparator"]}
      role="separator"
      {...props}
    >
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
