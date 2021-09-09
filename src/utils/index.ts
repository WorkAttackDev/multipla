import crypto from "crypto";

export const getHash = (
  data: string,
  secret: crypto.BinaryLike | crypto.KeyObject
) => {
  var hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  return hmac.digest("hex");
};

export const formatTodayDate = () => {
  var d = new Date(),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
};
