// Code generated by protoc-gen-go. DO NOT EDIT.
// source: eventsgateway/grpc/protobuf/events.proto

/*
Package eventsgateway is a generated protocol buffer package.

It is generated from these files:
	eventsgateway/grpc/protobuf/events.proto

It has these top-level messages:
	Event
	Response
*/
package eventsgateway

import proto "github.com/golang/protobuf/proto"
import fmt "fmt"
import math "math"

import (
	context "golang.org/x/net/context"
	grpc "google.golang.org/grpc"
)

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

// This is a compile-time assertion to ensure that this generated file
// is compatible with the proto package it is being compiled against.
// A compilation error at this line likely means your copy of the
// proto package needs to be updated.
const _ = proto.ProtoPackageIsVersion2 // please upgrade the proto package

type Event struct {
	Id        string            `protobuf:"bytes,1,opt,name=id" json:"id,omitempty"`
	Name      string            `protobuf:"bytes,2,opt,name=name" json:"name,omitempty"`
	Topic     string            `protobuf:"bytes,3,opt,name=topic" json:"topic,omitempty"`
	Props     map[string]string `protobuf:"bytes,4,rep,name=props" json:"props,omitempty" protobuf_key:"bytes,1,opt,name=key" protobuf_val:"bytes,2,opt,name=value"`
	Timestamp int64             `protobuf:"varint,5,opt,name=timestamp" json:"timestamp,omitempty"`
}

func (m *Event) Reset()                    { *m = Event{} }
func (m *Event) String() string            { return proto.CompactTextString(m) }
func (*Event) ProtoMessage()               {}
func (*Event) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{0} }

func (m *Event) GetId() string {
	if m != nil {
		return m.Id
	}
	return ""
}

func (m *Event) GetName() string {
	if m != nil {
		return m.Name
	}
	return ""
}

func (m *Event) GetTopic() string {
	if m != nil {
		return m.Topic
	}
	return ""
}

func (m *Event) GetProps() map[string]string {
	if m != nil {
		return m.Props
	}
	return nil
}

func (m *Event) GetTimestamp() int64 {
	if m != nil {
		return m.Timestamp
	}
	return 0
}

type Response struct {
}

func (m *Response) Reset()                    { *m = Response{} }
func (m *Response) String() string            { return proto.CompactTextString(m) }
func (*Response) ProtoMessage()               {}
func (*Response) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{1} }

func init() {
	proto.RegisterType((*Event)(nil), "eventsgateway.Event")
	proto.RegisterType((*Response)(nil), "eventsgateway.Response")
}

// Reference imports to suppress errors if they are not otherwise used.
var _ context.Context
var _ grpc.ClientConn

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
const _ = grpc.SupportPackageIsVersion4

// Client API for GRPCForwarder service

type GRPCForwarderClient interface {
	SendEvent(ctx context.Context, in *Event, opts ...grpc.CallOption) (*Response, error)
}

type gRPCForwarderClient struct {
	cc *grpc.ClientConn
}

func NewGRPCForwarderClient(cc *grpc.ClientConn) GRPCForwarderClient {
	return &gRPCForwarderClient{cc}
}

func (c *gRPCForwarderClient) SendEvent(ctx context.Context, in *Event, opts ...grpc.CallOption) (*Response, error) {
	out := new(Response)
	err := grpc.Invoke(ctx, "/eventsgateway.GRPCForwarder/SendEvent", in, out, c.cc, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// Server API for GRPCForwarder service

type GRPCForwarderServer interface {
	SendEvent(context.Context, *Event) (*Response, error)
}

func RegisterGRPCForwarderServer(s *grpc.Server, srv GRPCForwarderServer) {
	s.RegisterService(&_GRPCForwarder_serviceDesc, srv)
}

func _GRPCForwarder_SendEvent_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(Event)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(GRPCForwarderServer).SendEvent(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/eventsgateway.GRPCForwarder/SendEvent",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(GRPCForwarderServer).SendEvent(ctx, req.(*Event))
	}
	return interceptor(ctx, in, info, handler)
}

var _GRPCForwarder_serviceDesc = grpc.ServiceDesc{
	ServiceName: "eventsgateway.GRPCForwarder",
	HandlerType: (*GRPCForwarderServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "SendEvent",
			Handler:    _GRPCForwarder_SendEvent_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "eventsgateway/grpc/protobuf/events.proto",
}

func init() { proto.RegisterFile("eventsgateway/grpc/protobuf/events.proto", fileDescriptor0) }

var fileDescriptor0 = []byte{
	// 256 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0x6c, 0x90, 0x41, 0x4b, 0xc3, 0x30,
	0x14, 0xc7, 0x6d, 0xbb, 0x8a, 0x7d, 0xe2, 0x90, 0x87, 0x42, 0x18, 0x1e, 0x4a, 0x4f, 0x3d, 0xb5,
	0x30, 0x41, 0x86, 0x07, 0x2f, 0x32, 0x3d, 0x3a, 0xe2, 0x27, 0xc8, 0xd6, 0xb7, 0x51, 0xb4, 0x49,
	0x48, 0xb2, 0x8d, 0x7e, 0x4c, 0xbf, 0x91, 0x34, 0xb1, 0x0c, 0xc5, 0xdb, 0xfb, 0xff, 0xf2, 0xf2,
	0xf2, 0xcb, 0x83, 0x92, 0x0e, 0x24, 0x9d, 0xdd, 0x09, 0x47, 0x47, 0xd1, 0xd7, 0x3b, 0xa3, 0x37,
	0xb5, 0x36, 0xca, 0xa9, 0xf5, 0x7e, 0x5b, 0x87, 0xb3, 0xca, 0x67, 0x9c, 0xfa, 0xb4, 0x55, 0xe6,
	0x28, 0x4c, 0x43, 0xa6, 0xf8, 0x8a, 0x20, 0x5d, 0x0e, 0x08, 0xa7, 0x10, 0xb7, 0x0d, 0x8b, 0xf2,
	0xa8, 0xcc, 0x78, 0xdc, 0x36, 0x88, 0x30, 0x91, 0xa2, 0x23, 0x16, 0x7b, 0xe2, 0x6b, 0xbc, 0x81,
	0xd4, 0x29, 0xdd, 0x6e, 0x58, 0xe2, 0x61, 0x08, 0xf8, 0x00, 0xa9, 0x36, 0x4a, 0x5b, 0x36, 0xc9,
	0x93, 0xf2, 0x72, 0x9e, 0x57, 0xbf, 0xdf, 0xa8, 0xfc, 0xfc, 0x6a, 0x35, 0xb4, 0x2c, 0xa5, 0x33,
	0x3d, 0x0f, 0xed, 0x78, 0x07, 0x99, 0x6b, 0x3b, 0xb2, 0x4e, 0x74, 0x9a, 0xa5, 0x79, 0x54, 0x26,
	0xfc, 0x04, 0x66, 0x0b, 0x80, 0xd3, 0x15, 0xbc, 0x86, 0xe4, 0x83, 0xfa, 0x1f, 0xbd, 0xa1, 0x1c,
	0x5c, 0x0e, 0xe2, 0x73, 0x3f, 0x0a, 0x86, 0xf0, 0x18, 0x2f, 0xa2, 0x02, 0xe0, 0x82, 0x93, 0xd5,
	0x4a, 0x5a, 0x9a, 0xbf, 0xc1, 0xd5, 0x2b, 0x5f, 0x3d, 0xbf, 0x8c, 0x32, 0xf8, 0x04, 0xd9, 0x3b,
	0xc9, 0x26, 0xfc, 0xf9, 0xf6, 0x5f, 0xd5, 0x19, 0xfb, 0x8b, 0xc7, 0x71, 0xc5, 0xd9, 0xfa, 0xdc,
	0xef, 0xf1, 0xfe, 0x3b, 0x00, 0x00, 0xff, 0xff, 0x07, 0x62, 0xb0, 0x83, 0x73, 0x01, 0x00, 0x00,
}