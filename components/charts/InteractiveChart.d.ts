import { ComponentType } from "react";
import { ExerciseBlock } from "../../types";

export interface InteractiveChartProps {
  block: ExerciseBlock;
  value: string;
  onChange: (value: string) => void;
}

declare const InteractiveChart: ComponentType<InteractiveChartProps>;

export default InteractiveChart;
