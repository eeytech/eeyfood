import { OperatingHours, RestaurantStatus } from "./types";
export declare const isRestaurantOpen: (status: RestaurantStatus, operatingHours: OperatingHours[]) => boolean;
export declare const getNextOpeningTime: (operatingHours: OperatingHours[]) => {
    id: string;
    restaurantId: string;
    createdAt: Date;
    updatedAt: Date;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
} | null;
