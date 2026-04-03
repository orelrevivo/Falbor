export interface DevicePreset {
    name: string
    width: number
    height: number
    type: "phone" | "tablet" | "desktop"
}

export const DEVICE_PRESETS: DevicePreset[] = [
    { name: "Desktop", width: 1920, height: 1080, type: "desktop" },
    { name: "iPad Air 13-in.", width: 1024, height: 1366, type: "tablet" },
    { name: "iPad Air 11-in.", width: 820, height: 1180, type: "tablet" },
    { name: "iPad", width: 820, height: 1180, type: "tablet" },
    { name: "iPad Mini", width: 744, height: 1133, type: "tablet" },
    { name: "iPhone 17 Pro Max", width: 440, height: 956, type: "phone" },
    { name: "iPhone 17 Pro", width: 402, height: 873, type: "phone" },
    { name: "iPhone 17 Air", width: 420, height: 912, type: "phone" },
    { name: "iPhone 17", width: 402, height: 874, type: "phone" },
    { name: "iPhone 16 Pro Max", width: 440, height: 956, type: "phone" },
    { name: "iPhone 16 Pro", width: 402, height: 874, type: "phone" },
    { name: "iPhone 16 Plus", width: 430, height: 932, type: "phone" },
    { name: "iPhone 16", width: 393, height: 852, type: "phone" },
    { name: "iPhone 16e", width: 390, height: 844, type: "phone" },
    { name: "iPhone SE", width: 375, height: 667, type: "phone" },
    { name: "Pixel 10 Pro", width: 427, height: 952, type: "phone" },
    { name: "Pixel 10", width: 412, height: 915, type: "phone" },
    { name: "Galaxy 25+", width: 480, height: 1040, type: "phone" },
    { name: "Galaxy 25", width: 360, height: 780, type: "phone" },
]
