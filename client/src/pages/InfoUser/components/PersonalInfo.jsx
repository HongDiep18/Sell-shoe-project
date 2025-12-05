import { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, Avatar, Upload, message, Card, Divider, Spin, Row, Col, Tooltip } from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    HomeOutlined,
    MailOutlined,
    UploadOutlined,
    EditOutlined,
    SaveOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import { useStore } from '../../../hooks/useStore';
import moment from 'moment';
import { requestUpdateUser, requestUploadAvatar } from '../../../config/UserRequest';

function PersonalInfo() {
    const { dataUser, fetchAuth } = useStore();
    const [editing, setEditing] = useState(false);
    const [form] = Form.useForm();
    const [avatar, setAvatar] = useState(dataUser?.avatar || null);
    const [loading, setLoading] = useState(false);

    // Initialize form with user data
    useEffect(() => {
        if (dataUser) {
            console.log('PersonalInfo - dataUser:', dataUser);
            console.log('PersonalInfo - phone value:', dataUser.phone);
            form.setFieldsValue({
                fullName: dataUser.fullName || '',
                email: dataUser.email || '',
                phone: dataUser.phone ?? '', // Use nullish coalescing to handle null/undefined
                address: dataUser.address ?? '', // Use nullish coalescing
                birthDay: dataUser.birthDay ? moment(dataUser.birthDay) : null,
            });
        }
    }, [dataUser, form]);

    const handleEdit = () => {
        setEditing(true);
    };

    const handleCancel = () => {
        setEditing(false);
        form.resetFields();
    };

    const handleSave = async (values) => {
        setLoading(true);

        try {
            // Normalize phone: remove non-digits and if user entered 9 digits assume missing leading 0
            const payload = { ...values };
            if (payload.phone != null) {
                let digits = String(payload.phone).replace(/\D/g, '');
                if (digits.length === 9) {
                    digits = '0' + digits;
                }
                payload.phone = digits;
            }

            await requestUpdateUser(payload);
            message.success('Thông tin cá nhân đã được cập nhật thành công!');
            setEditing(false);
            // Refresh user data from server after successful update
            await fetchAuth();
            setLoading(false);
        } catch (error) {
            console.error('handleSave - error:', error);
            message.error('Thông tin cá nhân đã được cập nhật thất bại!');
            setLoading(false);
        }
    };

    const handlePhoneChange = (e) => {
        // keep only digits and limit to 10 chars
        const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 10);
        form.setFieldsValue({ phone: digits });
    };

    const beforeUpload = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('Bạn chỉ có thể tải lên tệp hình ảnh!');
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Kích thước hình ảnh phải nhỏ hơn 2MB!');
        }
        return isImage && isLt2M;
    };

    const handleChange = async (info) => {
        try {
            console.log('handleChange - uploading file:', info.file);
            const formData = new FormData();
            formData.append('avatar', info.file.originFileObj);
            console.log('handleChange - formData:', formData);
            const res = await requestUploadAvatar(formData);
            console.log('handleChange - response:', res);
            setAvatar(res.metadata);
            window.location.reload();
        } catch (error) {
            console.error('handleChange - error:', error);
            message.error('Tải lên thất bại!');
        }
    };

    return (
        <Card
            className="overflow-hidden"
            cover={
                <div className="h-40 bg-gradient-to-r from-[#e45464] to-[#d70018] relative">
                    <div className="absolute left-6 -bottom-16">
                        <Avatar
                            size={120}
                            src={`${import.meta.env.VITE_API_URL}/uploads/avatars/${dataUser?.avatar}`}
                            icon={<UserOutlined />}
                            className="border-4 border-white shadow-lg"
                        />
                    </div>
                </div>
            }
            actions={[
                !editing ? (
                    <Tooltip title="Chỉnh sửa thông tin">
                        <Button type="link" icon={<EditOutlined />} onClick={handleEdit}>
                            Chỉnh sửa
                        </Button>
                    </Tooltip>
                ) : (
                    <Tooltip title="Hủy">
                        <Button type="link" icon={<CloseOutlined />} onClick={handleCancel} danger>
                            Hủy
                        </Button>
                    </Tooltip>
                ),
                editing && (
                    <Tooltip title="Lưu thay đổi">
                        <Button type="link" icon={<SaveOutlined />} onClick={form.submit} style={{ color: '#1677ff' }}>
                            Lưu
                        </Button>
                    </Tooltip>
                ),
            ].filter(Boolean)}
        >
            <div className="mt-16 px-4">
                <h2 className="text-2xl font-bold text-gray-800">Thông tin cá nhân</h2>
                <p className="text-gray-500 mb-6">Quản lý thông tin cá nhân của bạn</p>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Spin size="large" />
                    </div>
                ) : (
                    <div className="pb-4">
                        {editing && (
                            <div className="mb-8">
                                <Divider orientation="left">Ảnh đại diện</Divider>
                                <div className="flex justify-center">
                                    <Upload
                                        name="avatar"
                                        listType="picture-card"
                                        className="avatar-uploader"
                                        showUploadList={false}
                                        action="/api/upload" // Replace with your upload API
                                        beforeUpload={beforeUpload}
                                        onChange={handleChange}
                                    >
                                        {avatar ? (
                                            <Avatar size={100} src={avatar} />
                                        ) : (
                                            <div>
                                                <UploadOutlined />
                                                <div style={{ marginTop: 8 }}>Tải lên</div>
                                            </div>
                                        )}
                                    </Upload>
                                </div>
                            </div>
                        )}

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSave}
                            disabled={!editing}
                            className="w-full"
                        >
                            <Divider orientation="left">Thông tin liên hệ</Divider>
                            <Row gutter={24}>
                                <Col span={24} md={12}>
                                    <Form.Item
                                        name="fullName"
                                        label="Họ và tên"
                                        rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                                    >
                                        <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
                                    </Form.Item>
                                </Col>
                                <Col span={24} md={12}>
                                    <Form.Item
                                        name="email"
                                        label="Email"
                                        rules={[
                                            { required: true, message: 'Vui lòng nhập email' },
                                            { type: 'email', message: 'Email không hợp lệ' },
                                        ]}
                                    >
                                        <Input prefix={<MailOutlined />} placeholder="Email" disabled />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={24}>
                                <Col span={24} md={12}>
                                    <Form.Item
                                        name="phone"
                                        label="Số điện thoại"
                                        rules={[
                                            { required: true, message: 'Vui lòng nhập số điện thoại' },
                                            {
                                                validator: (_, value) => {
                                                    const v = (value || '').toString().trim();
                                                    if (!/^0\d{9}$/.test(v)) {
                                                        return Promise.reject(
                                                            new Error(
                                                                'Số điện thoại phải bắt đầu từ 0 và có 10 chữ số',
                                                            ),
                                                        );
                                                    }
                                                    return Promise.resolve();
                                                },
                                            },
                                        ]}
                                    >
                                        <Input
                                            prefix={<PhoneOutlined />}
                                            placeholder="Nhập số bắt đầu từ 0 (10 chữ số)"
                                            maxLength={10}
                                            inputMode="numeric"
                                            onChange={handlePhoneChange}
                                        />
                                    </Form.Item>
                                    {/* Debug: show phone value */}
                                    {/* {editing && (
                                        <div style={{ fontSize: '12px', color: '#999', marginTop: '-15px' }}>
                                            (Debug - phone từ DB: {dataUser?.phone || 'không có'})
                                        </div>
                                    )} */}
                                </Col>
                                <Col span={24} md={12}>
                                    <Form.Item name="birthDay" label="Ngày sinh">
                                        <DatePicker
                                            format="DD/MM/YYYY"
                                            placeholder="Chọn ngày sinh"
                                            className="w-full"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left">Địa chỉ</Divider>
                            <Form.Item name="address" label="Địa chỉ giao hàng">
                                <Input.TextArea prefix={<HomeOutlined />} placeholder="Địa chỉ nhận hàng" rows={3} />
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </div>
        </Card>
    );
}

export default PersonalInfo;
