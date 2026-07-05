import _ from "lodash";

const discordProfilePictureForUser = ({ id, picture }: { id: string; picture?: string | null }) => {
  if (!picture || (picture.match(/gravatar/) && id.match(/discord/))) {
    return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(_.last(id.split(/\|/g)) ?? 0) >> 22n) % 6n)}.png`;
  }

  return picture;
};

export default discordProfilePictureForUser;
