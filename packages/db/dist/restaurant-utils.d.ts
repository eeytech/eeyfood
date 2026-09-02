import { OperatingHours, RestaurantStatus } from "./types";
export interface RestaurantOpenStatus {
    isOpen: boolean;
    closeTime?: string;
}
export declare const getBrazilTime: () => {
    dayOfWeek: number;
    hours: number;
    minutes: number;
};
export declare const isRestaurantOpen: (status: RestaurantStatus, operatingHours: OperatingHours[]) => RestaurantOpenStatus;
export declare const getNextOpeningTime: (operatingHours: OperatingHours[]) => {
    id: string;
    restaurantId: string;
    createdAt: Date;
    updatedAt: Date;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
} | null;
