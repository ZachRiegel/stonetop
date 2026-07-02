import plusSvg from "icons/plus.svg?raw";
import styled from "@emotion/styled";

const IconSvgs = {
  Plus: plusSvg,
};

type IconName = keyof typeof IconSvgs;

type IconPropsInternal = { icon: IconName; className?: string };
export type IconProps = Omit<IconPropsInternal, "icon">;

const IconInternal = ({ icon, className }: IconPropsInternal) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: IconSvgs[icon] }} />
);

const StyledIcon = styled(IconInternal)`
  display: inline-flex;

  & svg {
    width: 32px;
    height: 32px;
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
