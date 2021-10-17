import "./index.scss";
import { prefix } from "../../common/consts";
import Box from "../../components/Box";
import classnames from "classnames";
import { useState, useLayoutEffect, useRef, useMemo, useEffect } from "react";
import { SettingOutlined, ReloadOutlined } from "@ant-design/icons";
import { Switch, Input, InputNumber, Button, message } from "antd";
import "antd/dist/antd.css";
import useSound from "use-sound";
import throttle from "lodash/throttle";

import flipSfx from "../../assets/flip.wav";

let draw_list = [];

// Check if souceNode is overlaping on targetNode
const isOverlap = (souceNode, targetNode) => {
  const souceRect = souceNode?.getBoundingClientRect();
  const targetRect = targetNode?.getBoundingClientRect();
  if (!souceRect || !targetRect) {
    return;
  }
  return souceRect.left < targetRect.left && souceRect.right > targetRect.right;
};

let iniSpeed = 48;
const boxs_count = 10;
let resistance = 0.08;
let init_loop_count = 25;
let loop_before_slow_down = 35;
// When speed < low_resistance_speed, update the resistance to low_resistance
let low_resistance_speed = 1.5;
let low_resistance = 0.007;

let timer;
let shift_x = [];
let randomBoxs = [];
let box_width, initial_x;
let loop_count = init_loop_count;
let speed = iniSpeed;

let prevSelectedIndex = boxs_count - 1;
let items_temp = {};

const defaultConfigs = {
  iniSpeed,
  resistance,
  loop_before_slow_down,
  low_resistance_speed,
  low_resistance,
  draw_list,
};

const resetData = () => {
  speed = iniSpeed;
  loop_count = init_loop_count;
};

function Main() {
  const [playSound_flip] = useSound(flipSfx, {
    interrupt: true,
  });
  const [isStart, setStart] = useState(false);
  const [selected, updateSelected] = useState([]);
  const [shiftX, updateShiftX] = useState(shift_x);
  const [settingPanel, showSettingPanel] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [settingForm, updateSettingForm] = useState();
  const [itemsPanel, showItemsPanel] = useState(false);
  const [isEnd, setIsEnd] = useState(false);
  const [playSound_flip_thrott, set_playSound_flip_thrott] = useState({
    callback: undefined,
  });

  const centralLineRef = useRef(null);

  const resetToDefaultConfigs = () => {
    ({
      iniSpeed,
      resistance,
      loop_before_slow_down,
      low_resistance_speed,
      low_resistance,
    } = defaultConfigs);
    const configs = { ...defaultConfigs, draw_list: draw_list || [] };
    updateSettingForm(configs);
    return configs;
  };

  useEffect(() => {
    if (typeof playSound_flip === "function") {
      set_playSound_flip_thrott({ callback: throttle(playSound_flip, 60) });
    }
  }, [playSound_flip]);

  useEffect(() => {
    // Read saved user configs
    try {
      let configs = localStorage.getItem("the_lucky_one_configs");
      if (!configs) {
        resetToDefaultConfigs();
        return;
      }
      configs = JSON.parse(configs);
      ({
        iniSpeed = iniSpeed,
        resistance = resistance,
        loop_before_slow_down = loop_before_slow_down,
        low_resistance_speed = low_resistance_speed,
        low_resistance = low_resistance,
        draw_list = draw_list,
      } = configs);
      updateSettingForm(configs);
      randomBoxs = generateBoxs(boxs_count);
    } catch (err) {
      console.log("Read save user configs error: ", err);
    }
  }, []);

  const onStart = () => {
    if (!isStart) {
      if (!randomBoxs?.filter((_) => _)?.length) {
        message.info("Please add some items first");
        message.info("Click on the config icon on the top right to add items");
        return;
      }
      resetData();
      setStart(true);
      setTimeout(() => {
        // Randomize the end position
        const loop_before_slow_down_ =
          loop_before_slow_down + Math.floor(Math.random() * 100);

        initial_x = randomBoxs.map(
          (_, index) =>
            document.querySelector(`#${prefix}box-${index}`)?.offsetLeft
        );
        box_width = document.querySelector(`#${prefix}box-0`).clientWidth;
        ////////////////////////////////////////////////////////////////
        const loopFunc = () => {
          updateSelected(
            randomBoxs.map((_, index) => {
              return isOverlap(
                document.querySelector(`#${prefix}box-${index}`),
                centralLineRef.current
              );
            })
          );
          const newShiftX = randomBoxs.map((_, index) => {
            const overflow_x =
              initial_x[index] + box_width + (shift_x[index] || 0);
            const new_shift_x =
              overflow_x > 0
                ? (shift_x[index] ?? 0) - speed
                : initial_x[boxs_count - 1] -
                  initial_x[index] +
                  overflow_x -
                  speed;
            return new_shift_x;
          });
          shift_x = newShiftX;
          updateShiftX(newShiftX);

          // Alter speed
          loop_count++;
          if (loop_count >= loop_before_slow_down_) {
            if (speed < low_resistance_speed) {
              speed -= low_resistance;
            } else {
              speed -= resistance;
            }
          }

          if (speed <= 0) {
            speed = 0;
            // clearInterval(timer);
            setIsEnd(true);
            return;
          }

          requestAnimationFrame(loopFunc);
        };

        requestAnimationFrame(loopFunc);

        ////////////////////////////////////////////////////////////////
      }, 500);
    }
  };

  useLayoutEffect(() => {
    randomBoxs = generateBoxs(boxs_count);
    return () => {
      clearInterval(timer);
    };
  }, []);

  // Generate random boxs with random contents draw from list
  const generateBoxs = (count) => {
    const draw_list_length = draw_list.length;
    const shift_x = Array(count).fill(0);
    return shift_x.map(() => {
      const randIndex = Math.floor(Math.random() * draw_list_length);
      return draw_list[randIndex];
    });
  };

  const saveConfigs = (configs) => {
    // Save user configs to localstorage
    console.log(settingForm);
    localStorage.setItem(
      "the_lucky_one_configs",
      JSON.stringify(configs ? configs : settingForm)
    );
    closePanel();
    message.success("Saved");
    randomBoxs = generateBoxs(boxs_count);
  };

  const renderBoxs = useMemo(() => {
    return randomBoxs.map((item, index) => {
      const isSelected = selected[index] && !selected[index - 1];
      if (isSelected) {
        if (
          index - prevSelectedIndex === 1 ||
          index - prevSelectedIndex === -(boxs_count - 1)
        ) {
          if (typeof playSound_flip_thrott?.callback === "function") {
            playSound_flip_thrott.callback();
          }
        }
        prevSelectedIndex = index;
      }
      return (
        <Box
          key={`${prefix}box-${index}`}
          id={`${prefix}box-${index}`}
          style={{
            transform: `translateX(${shiftX[index] || 0}px) ${
              isSelected ? (isEnd ? "scale(1.5)" : "scale(1.1)") : ""
            }`,
          }}
          className={classnames(
            `${prefix}box`,
            isSelected && `${prefix}box-selected`,
            isSelected && isEnd && `${prefix}box-winnner`
          )}
          text={item}
        />
      );
    });
  }, [randomBoxs, shiftX, isEnd, playSound_flip_thrott]);

  const renderInputForm = useMemo(() => {
    if (!settingForm) return;
    return (
      <>
        <div>
          iniSpeed:
          <InputNumber
            size="small"
            defaultValue={settingForm.iniSpeed}
            onChange={(value) => {
              updateSettingForm({
                ...settingForm,
                iniSpeed: value,
              });
              iniSpeed = value;
            }}
          />
        </div>
        <div>
          resistance:
          <InputNumber
            size="small"
            step="0.01"
            defaultValue={settingForm.resistance}
            onChange={(value) => {
              updateSettingForm({
                ...settingForm,
                resistance: value,
              });
              resistance = value;
            }}
          />
        </div>
        <div>
          loop_before_slow_down:
          <InputNumber
            size="small"
            defaultValue={settingForm.loop_before_slow_down}
            onChange={(value) => {
              updateSettingForm({
                ...settingForm,
                loop_before_slow_down: value,
              });
              loop_before_slow_down = value;
            }}
          />
        </div>
        <div>
          low_resistance_speed:
          <InputNumber
            size="small"
            defaultValue={settingForm.low_resistance_speed}
            onChange={(value) => {
              updateSettingForm({
                ...settingForm,
                low_resistance_speed: value,
              });
              low_resistance_speed = value;
            }}
          />
        </div>
        <div>
          low_resistance:
          <InputNumber
            size="small"
            defaultValue={settingForm.low_resistance}
            onChange={(value) => {
              updateSettingForm({
                ...settingForm,
                low_resistance: value,
              });
              low_resistance = value;
            }}
          />
        </div>
        <div>
          Debug mode:
          <Switch onChange={(checked) => setDebugMode(checked)} />
        </div>
      </>
    );
  }, [settingForm]);

  const renderItemsPanel = useMemo(() => {
    if (!settingForm) {
      return;
    }
    return (
      <>
        <div>
          <div>
            <InputNumber
              size="small"
              placeholder={0}
              onChange={(value) => {
                items_temp["start_number"] = value;
              }}
            />
            -{" "}
            <InputNumber
              size="small"
              placeholder={0}
              onChange={(value) => {
                items_temp["end_number"] = value;
              }}
            />
          </div>
          <Button
            type="primary"
            onClick={() => {
              for (
                let i = items_temp["start_number"] ?? 0;
                i <= items_temp["end_number"] ?? 0;
                i++
              ) {
                draw_list.push(i);
              }
              updateSettingForm({
                ...settingForm,
                draw_list: draw_list,
              });
            }}
          >
            Add
          </Button>
        </div>
        <div>
          <Input
            size="small"
            placeholder={"Enter an item"}
            onChange={(e) => {
              const { value } = e.target;
              if (!value) return;
              items_temp["draw_list"] = value;
            }}
          />
          <Button
            type="primary"
            onClick={() => {
              draw_list.push(items_temp["draw_list"]);
              updateSettingForm({
                ...settingForm,
                draw_list: draw_list,
              });
            }}
          >
            Add
          </Button>
        </div>
        <ul>
          {draw_list.map((item, index) => {
            return (
              <span key={`draw-list-item${index}`}>
                {item}
                <Button
                  type="link"
                  onClick={() => {
                    draw_list = [
                      ...draw_list.slice(0, index),
                      ...draw_list.slice(index + 1),
                    ];
                    updateSettingForm({
                      ...settingForm,
                      draw_list: draw_list,
                    });
                  }}
                >
                  Remove
                </Button>
              </span>
            );
          })}
        </ul>
      </>
    );
  }, [settingForm]);

  const closePanel = () => {
    showSettingPanel(false);
    showItemsPanel(false);
  };

  return (
    <div className={`${prefix}container`}>
      <div className={debugMode ? `${prefix}debug-panel` : undefined}>
        <span>loop_count: {loop_count}</span>
        <span>speed: {speed}</span>
        <span>iniSpeed: {iniSpeed}</span>
        <span>resistance: {resistance}</span>
        <span>loop_before_slow_down: {loop_before_slow_down}</span>
        <span>low_resistance_speed: {low_resistance_speed}</span>
        <span>low_resistance: {low_resistance}</span>
      </div>
      <SettingOutlined
        className={`${prefix}setting-icon`}
        onClick={() => showSettingPanel(true)}
      />
      <div
        className={classnames(
          `${prefix}setting-panel`,
          !settingPanel && `${prefix}setting-panel-hide`,
          itemsPanel && `${prefix}items-panel`
        )}
      >
        {settingPanel && (itemsPanel ? renderItemsPanel : renderInputForm)}
        <Button
          type="primary"
          shape="round"
          size="middle"
          onClick={() => showItemsPanel(!itemsPanel)}
        >
          {!itemsPanel ? "Config Items" : "Config properties"}
        </Button>
        <Button
          type="primary"
          shape="round"
          size="middle"
          onClick={() => {
            const defaultConfigs = resetToDefaultConfigs();
            saveConfigs(defaultConfigs);
            message.info("Configs have been reset to default");
            showSettingPanel(false);
          }}
        >
          Reset User Configs
        </Button>
        <Button
          type="primary"
          shape="round"
          size="middle"
          onClick={settingPanel ? () => saveConfigs() : undefined}
        >
          Save
        </Button>
        <Button
          type="secondary"
          shape="round"
          size="middle"
          onClick={closePanel}
        >
          close
        </Button>
      </div>
      <div
        className={classnames(
          `${prefix}drawer-wrapper`,
          !isStart && `${prefix}start-button`
        )}
        onClick={onStart}
        style={{ opacity: !settingPanel ? "1" : "0" }}
      >
        <div
          ref={centralLineRef}
          className={`${prefix}central-line`}
          style={{ opacity: isStart && !isEnd ? "1" : "0" }}
        ></div>
        <ReloadOutlined
          className={`${prefix}reset-button`}
          style={{ opacity: isEnd ? "1" : "0" }}
          onClick={() => {
            setStart(false);
            setIsEnd(false);
            resetData();
          }}
        >
          Reset
        </ReloadOutlined>
        {isStart ? renderBoxs : "Start"}
      </div>
      <span
        className={classnames(`${prefix}icon`, isStart && `${prefix}icon-hide`)}
      >
        ∞
      </span>
    </div>
  );
}

export default Main;
