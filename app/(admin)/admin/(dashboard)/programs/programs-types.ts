export type ProgramStatusSort = "none" | "active_first" | "inactive_first";
export type ProgramRegistrationsSort = "none" | "most" | "fewest";

export type ProgramCardItem = {
  id: string;
  programId: string;
  name: string;
  isActive: boolean;
  _count: {
    registrations: number;
    intakeWindows: number;
  };
  intakeWindows: Array<{
    windowName: string;
    opensAt: string;
    closesAt: string;
  }>;
};

export type EditableProgram = {
  id: string;
  programId: string;
  code: string;
  name: string;
  yearLabel: string;
  durationLabel: string;
  basePrice: string;
  currency: string | null;
  isActive: boolean;
};

export type ProgramIntakeItem = {
  id: string;
  windowName: string;
  opensAt: string;
  closesAt: string;
  priceOverride: string | null;
  isActive: boolean;
};
