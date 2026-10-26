/** Diorama layout in meters. Plinth is 22 x 15, centered on the origin. Back wall at z = -7.5. */
export type Vec3 = [number, number, number];

export const PLINTH = { w: 22, d: 15, h: 0.7 };

export const OFFICES: { id: 'office_a' | 'office_b' | 'office_c'; x: number; label: string }[] = [
  { id: 'office_a', x: -8.6, label: 'Dana Ortiz, Operations Manager' },
  { id: 'office_b', x: -5.0, label: 'Marcus Bell, Program Manager' },
  { id: 'office_c', x: -1.4, label: 'Dr. Helen Park, Director' },
];
export const OFFICE = { w: 3.4, d: 3.6, h: 2.6, z: -5.7 };

/** Desk positions, two rows of four. Employees sit at these. */
export const PODS: Record<string, Vec3> = {
  pod_1: [-5.2, 0, 0.2], pod_2: [-3.2, 0, 0.2], pod_3: [-1.2, 0, 0.2], pod_4: [0.8, 0, 0.2],
  pod_5: [-5.2, 0, 2.4], pod_6: [-3.2, 0, 2.4], pod_7: [-1.2, 0, 2.4], pod_8: [0.8, 0, 2.4],
};

export const SPOTS: Record<string, Vec3> = {
  terminal: [6.2, 0, 4.4],
  hcm_2: [8.6, 0, 4.4],
  board: [2.6, 1.7, -7.35],
  office_a: [-8.6, 0, -5.4],
  office_b: [-5.0, 0, -5.4],
  office_c: [-1.4, 0, -5.4],
  reception: [-8.2, 0, 5.0],
  break: [8.0, 0, -4.8],
};

/** Where each person sits. Pod and HCM seats face the desk (-z); office seats face the glass (+z). */
export const facesGlass = (desk: string) => desk.startsWith('office_');

export function seatFor(desk: string): Vec3 {
  if (PODS[desk]) { const [x, , z] = PODS[desk]; return [x, 0, z + 0.62]; }
  if (desk === 'office_a' || desk === 'office_b' || desk === 'office_c') { const [x] = SPOTS[desk]; return [x, 0, -7.05]; }
  if (desk === 'hcm_2') { const [x, , z] = SPOTS.hcm_2; return [x, 0, z + 0.62]; }
  // A new hire waits at reception on their first morning.
  if (desk === 'reception') { const [x, , z] = SPOTS.reception; return [x + 1.1, 0, z - 0.4]; }
  return [0, 0, 0];
}

/** Where the camera looks for each hotspot. */
export const FOCUS: Record<string, Vec3> = {
  terminal: [6.2, 0.8, 4.4], board: [2.6, 1.6, -6.6], office_a: [-8.6, 1, -5.4], office_b: [-5.0, 1, -5.4],
  office_c: [-1.4, 1, -5.4], reception: [-8.2, 0.8, 5], break: [8, 0.8, -4.8], overview: [0, 0.4, 0],
};
