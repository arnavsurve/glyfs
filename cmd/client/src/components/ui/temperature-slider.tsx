import { useState } from "react"
import { Label } from "./label"
import { Input } from "./input"
import { Slider } from "./slider"
import { cn } from "../../lib/utils"

interface TemperatureSliderProps {
  value: number
  onChange: (value: number) => void
  className?: string
  label?: string
  id?: string
}

export function TemperatureSlider({
  value,
  onChange,
  className,
  label = "Temperature",
  id = "temperature"
}: TemperatureSliderProps) {
  const [inputValue, setInputValue] = useState(value.toString())
  const [isInputFocused, setIsInputFocused] = useState(false)

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0]
    onChange(newValue)
    if (!isInputFocused) {
      setInputValue(newValue.toString())
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value
    setInputValue(inputVal)
    
    // Only update the actual value if it's a valid number
    const numValue = parseFloat(inputVal)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
      onChange(numValue)
    }
  }

  const handleInputBlur = () => {
    setIsInputFocused(false)
    const numValue = parseFloat(inputValue)
    
    // Reset to current value if input is invalid
    if (isNaN(numValue) || numValue < 0 || numValue > 1) {
      setInputValue(value.toString())
    } else {
      // Ensure the value is properly formatted
      const clampedValue = Math.max(0, Math.min(1, numValue))
      setInputValue(clampedValue.toString())
      onChange(clampedValue)
    }
  }

  const handleInputFocus = () => {
    setIsInputFocused(true)
  }


  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <Input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          className="w-16 h-8 text-center text-sm"
          placeholder="0.5"
        />
      </div>
      
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        min={0}
        max={1}
        step={0.1}
        className="w-full"
      />
      
      <p className="text-xs text-muted-foreground">
        Response randomness (0.0-1.0)
      </p>
    </div>
  )
}