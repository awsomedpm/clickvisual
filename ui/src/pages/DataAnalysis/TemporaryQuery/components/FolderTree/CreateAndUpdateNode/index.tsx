import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useModel } from "umi";
import { bigDataNavEnum } from "@/pages/DataAnalysis";
import { folderType } from "@/pages/DataAnalysis/service/enums";

const { Option } = Select;

const CreateAndUpdateNode = () => {
  const folderForm = useRef<FormInstance>(null);
  const { currentInstances, temporaryQuery, navKey } = useModel("dataAnalysis");
  const primary = navKey == bigDataNavEnum.TemporaryQuery ? 3 : 0;

  const {
    getDataList,
    doCreatedNode,
    doUpdateNode,
    currentFolder,
    isUpdateNode,
    visibleNode,
    doGetNodeInfo,
    changeVisibleNode,
  } = temporaryQuery;

  useEffect(() => {
    if (visibleNode && currentFolder) {
      if (!isUpdateNode) {
        if (currentFolder.nodeType == folderType.node) {
          // 节点上创建是指在节点父级文件夹上创建
          folderForm.current?.setFieldsValue({
            iid: currentInstances,
            folderId: currentFolder.parentId,
            primary: primary,
          });
          return;
        }
        folderForm.current?.setFieldsValue({
          iid: currentInstances,
          folderId: currentFolder.id,
          primary: primary,
        });
        return;
      }
      doGetNodeInfo.run(currentFolder.id).then((res: any) => {
        if (res.code == 0) {
          folderForm.current?.setFieldsValue({
            iid: currentInstances,
            id: currentFolder.id,
            folderId: currentFolder.parentId,
            primary: primary,
            name: currentFolder.name,
            desc: currentFolder.desc,
            content: res.data.content,
          });
        }
      });
      console.log(currentFolder);

      return;
    }
    folderForm.current?.resetFields();
  }, [currentFolder, visibleNode]);

  const handleSubmit = (file: {
    iid: number;
    id: number;
    name: string;
    primary: number;
    secondary: number;
    tertiary: number;
    content: string;
    desc?: string;
    folderId?: number;
  }) => {
    let data: any = {
      id: file.id as number,
      folderId: file.folderId as number,
      name: file.name as string,
      desc: file.desc as string,
      content: file.content as string,
    };
    if (!isUpdateNode) {
      data = Object.assign(data, {
        iid: file.iid as number,
        primary: file.primary as number,
        secondary: file.secondary as number,
        tertiary: file.tertiary as number,
      });
      doCreatedNode.run(data).then((res: any) => {
        if (res.code == 0) {
          message.success("新建成功");
          changeVisibleNode(false);
          getDataList(currentInstances as number);
        }
      });
      return;
    }
    doUpdateNode.run(data.id, data).then((res: any) => {
      if (res.code == 0) {
        message.success("更新成功");
        changeVisibleNode(false);
        getDataList(currentInstances as number);
      }
    });
  };
  return (
    <Modal
      confirmLoading={doCreatedNode.loading || doUpdateNode.loading}
      title={!isUpdateNode ? "新建节点" : "修改节点"}
      visible={visibleNode}
      bodyStyle={{ paddingBottom: 0 }}
      onCancel={() => changeVisibleNode(false)}
      onOk={() => folderForm.current?.submit()}
    >
      <Form
        ref={folderForm}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        onFinish={handleSubmit}
      >
        <Form.Item name={"id"} hidden>
          <Input type="number" />
        </Form.Item>
        <Form.Item name={"iid"} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={"folderId"} hidden>
          <Input type="number" />
        </Form.Item>
        <Form.Item name={"primary"} hidden>
          <Input type="number" />
        </Form.Item>
        <Form.Item name={"secondary"} label="secondary" initialValue={1}>
          <Select disabled>
            <Option value={1}>数据库</Option>、
          </Select>
        </Form.Item>
        <Form.Item name={"tertiary"} label="tertiary" initialValue={1}>
          <Select disabled>
            <Option value={1}>clickhouse</Option>、
          </Select>
        </Form.Item>
        <Form.Item name={"name"} label="name" required>
          <Input />
        </Form.Item>
        <Form.Item name={"content"} label="content">
          <Input />
        </Form.Item>
        <Form.Item name={"desc"} label="desc">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateAndUpdateNode;
