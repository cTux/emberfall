export interface VolumeControlProps {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}
