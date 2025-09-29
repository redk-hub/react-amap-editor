import React, { useState } from "react";
import { AMapEditor } from "../src";
import { Layout, Button, Card, message, Space, Typography } from "antd";
import axios from "axios";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const App = () => {
  const [log, setLog] = useState("");
  const [loading, setLoading] = useState(false);

  // 示例API请求函数
  const handleApiRequest = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/test");
      message.success("API请求成功: " + JSON.stringify(response.data));
      setLog("API响应: " + JSON.stringify(response.data));
    } catch (error) {
      message.error("API请求失败: " + error.message);
      setLog("API错误: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeoserverRequest = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/geoserver/rest/about/version.json");
      message.success("GeoServer请求成功");
      setLog("GeoServer版本: " + JSON.stringify(response.data));
    } catch (error) {
      message.error("GeoServer请求失败: " + error.message);
      setLog("GeoServer错误: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ height: "100vh" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          React AMap Editor 示例
        </Title>
      </Header>
      <Layout>
        <Sider width={300} style={{ background: "#fff", padding: "16px" }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Card title="操作面板" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button
                  type="primary"
                  onClick={handleApiRequest}
                  loading={loading}
                  block
                >
                  测试API请求
                </Button>
                <Button
                  onClick={handleGeoserverRequest}
                  loading={loading}
                  block
                >
                  测试GeoServer请求
                </Button>
              </Space>
            </Card>
            <Card title="日志信息" size="small">
              <Text code style={{ fontSize: "12px", wordBreak: "break-all" }}>
                {log || "暂无日志信息"}
              </Text>
            </Card>
          </Space>
        </Sider>
        <Content style={{ padding: 0 }}>
          <div style={{ width: "100%", height: "100%" }}>
            <AMapEditor
              amapKey="cd4c46df876318f649075037f7e27cf3"
              style={{ width: "100%", height: "100%" }}
              onDrawEnd={(f) =>
                setLog("绘制完成: " + JSON.stringify(f.toGeoJSON?.()))
              }
              onSelect={(f) =>
                setLog("选中: " + JSON.stringify(f.toGeoJSON?.()))
              }
              onDelete={(f, all) =>
                setLog(
                  "删除: " +
                    JSON.stringify(f.toGeoJSON?.()) +
                    " 剩余: " +
                    all.length
                )
              }
              bbox={[
                [
                  [116.716203, 40.079011],
                  [116.716203, 39.741667],
                  [116.078653, 39.741667],
                  [116.078653, 40.079011],
                  [116.716203, 40.079011],
                ],
              ]}
              features={[
                {
                  type: "Feature",
                  id: "17588767860176cjj577lagp",
                  properties: {},
                  geometry: {
                    type: "MultiPolygon",
                    coordinates: [
                      [
                        [
                          [116.162499, 40.019722],
                          [116.293838, 40.02334],
                          [116.27116, 39.874846],
                          [116.162499, 40.019722],
                        ],
                      ],
                    ],
                  },
                },
                {
                  type: "Feature",
                  id: "175887678862192a4n9tyd0h",
                  properties: {},
                  geometry: {
                    type: "MultiPolygon",
                    coordinates: [
                      [
                        [
                          [116.324074, 39.948771],
                          [116.445964, 39.988599],
                          [116.39494, 39.874846],
                          [116.324074, 39.948771],
                        ],
                      ],
                    ],
                  },
                },
              ]}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
