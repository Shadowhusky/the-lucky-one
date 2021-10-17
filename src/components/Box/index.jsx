import "./index.scss";
import classnames from "classnames";

function Box(props) {
  const { className, text, ...others } = props;
  return (
    <div className={classnames(className, "btf-box-container")} {...others}>
      {text}
    </div>
  );
}

export default Box;
