export enum DescriptorType {
  REGULAR,
  DIRECTORY
}

export interface Descriptor {
  type: DescriptorType;
  links: number;
  size: number;
  blocks: number[];
}
