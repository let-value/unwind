import styles from "./slider.module.css";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "#/lib/utils.ts";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max];

  return (
    <SliderPrimitive.Root
      className={cn(styles["slider-data"], className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className={styles["slider-relative"]}>
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={styles["slider-relative-grow"]}
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className={styles["slider-bg"]}
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className={styles["slider-block"]}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
