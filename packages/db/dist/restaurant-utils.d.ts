import { OperatingHours, RestaurantStatus } from "./types.js";
export declare const isRestaurantOpen: (status: RestaurantStatus, operatingHours: OperatingHours[]) => boolean;
export declare const getNextOpeningTime: (operatingHours: OperatingHours[]) => {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
} | null;
