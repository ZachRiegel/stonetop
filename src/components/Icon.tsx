import plusSvg from "icons/plus.svg?raw";
import discordSvg from "icons/discordLogo.svg?raw";
import styled from "@emotion/styled";

const IconSvgs = {
  Plus: plusSvg,
  Discord: discordSvg,
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
    width: var(--icon-size, 24px);
    height: var(--icon-size, 24px);
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
