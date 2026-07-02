import plusSvg from "icons/plus.svg?raw";
import styled from "@emotion/styled";

const IconSvgs = {
  Plus: plusSvg,
};

type IconName = keyof typeof IconSvgs;

type IconPropsInternal = { icon: IconName; className?: string; size: number };
export type IconProps = Omit<IconPropsInternal, "icon">;

const IconInternal = ({ icon, className, size }: IconPropsInternal) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: IconSvgs[icon] }} />
);

const StyledIcon = styled(IconInternal)<{ size: number }>`
  display: inline-flex;

  & svg {
    --size: ${(props) => props.size}px;
    width: var(--size);
    height: var(--size);
    fill: currentColor;
    stroke: currentColor;
  }
`;

const Icon = Object.fromEntries(
  (Object.keys(IconSvgs) as IconName[]).map((icon) => [
    icon,
    (props: IconProps) => <StyledIcon icon={icon} {...props} />,
  ]),
) as Record<IconName, React.FC<{ className?: string }>>;

export default Icon;
