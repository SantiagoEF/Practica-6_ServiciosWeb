const TNS = 'http://banco.ejemplo.com/servicio';

function construirWsdl(location) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="BancoService"
  targetNamespace="${TNS}"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:tns="${TNS}"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/">

  <!-- ========== TIPOS (XSD) ========== -->
  <types>
    <xsd:schema targetNamespace="${TNS}" elementFormDefault="qualified">

      <xsd:simpleType name="NumeroCuenta">
        <xsd:restriction base="xsd:string">
          <xsd:pattern value="[0-9]{10}"/>
        </xsd:restriction>
      </xsd:simpleType>

      <!-- Cabecera SOAP opcional: identifica al comercio que consume el servicio -->
      <xsd:element name="IdComercio" type="xsd:string"/>

      <!-- ValidarSaldo -->
      <xsd:element name="ValidarSaldoRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="numeroCuenta" type="tns:NumeroCuenta"/>
            <xsd:element name="monto" type="xsd:double"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="ValidarSaldoResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="resultado" type="xsd:boolean"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <!-- EjecutarTransferencia -->
      <xsd:element name="EjecutarTransferenciaRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="cuentaOrigen" type="tns:NumeroCuenta"/>
            <xsd:element name="cuentaDestino" type="tns:NumeroCuenta"/>
            <xsd:element name="monto" type="xsd:double"/>
            <xsd:element name="tokenAutenticacion" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="EjecutarTransferenciaResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="idTransaccion" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <!-- ObtenerEstadoCuenta -->
      <xsd:complexType name="Movimiento">
        <xsd:sequence>
          <xsd:element name="idTransaccion" type="xsd:string"/>
          <xsd:element name="tipo" type="xsd:string"/>
          <xsd:element name="monto" type="xsd:double"/>
          <xsd:element name="fecha" type="xsd:string"/>
        </xsd:sequence>
      </xsd:complexType>
      <xsd:element name="ObtenerEstadoCuentaRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="numeroCuenta" type="tns:NumeroCuenta"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="ObtenerEstadoCuentaResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="numeroCuenta" type="xsd:string"/>
            <xsd:element name="titular" type="xsd:string"/>
            <xsd:element name="tipoCuenta" type="xsd:string"/>
            <xsd:element name="saldo" type="xsd:double"/>
            <xsd:element name="moneda" type="xsd:string"/>
            <xsd:element name="estado" type="xsd:string"/>
            <xsd:element name="movimientos" type="tns:Movimiento" minOccurs="0" maxOccurs="unbounded"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <!-- ========== MENSAJES ========== -->
  <message name="CabeceraComercio"><part name="cabecera" element="tns:IdComercio"/></message>
  <message name="ValidarSaldoIn"><part name="parameters" element="tns:ValidarSaldoRequest"/></message>
  <message name="ValidarSaldoOut"><part name="parameters" element="tns:ValidarSaldoResponse"/></message>
  <message name="EjecutarTransferenciaIn"><part name="parameters" element="tns:EjecutarTransferenciaRequest"/></message>
  <message name="EjecutarTransferenciaOut"><part name="parameters" element="tns:EjecutarTransferenciaResponse"/></message>
  <message name="ObtenerEstadoCuentaIn"><part name="parameters" element="tns:ObtenerEstadoCuentaRequest"/></message>
  <message name="ObtenerEstadoCuentaOut"><part name="parameters" element="tns:ObtenerEstadoCuentaResponse"/></message>

  <!-- ========== PORT TYPE ========== -->
  <portType name="BancoPortType">
    <operation name="ValidarSaldo">
      <input message="tns:ValidarSaldoIn"/>
      <output message="tns:ValidarSaldoOut"/>
    </operation>
    <operation name="EjecutarTransferencia">
      <input message="tns:EjecutarTransferenciaIn"/>
      <output message="tns:EjecutarTransferenciaOut"/>
    </operation>
    <operation name="ObtenerEstadoCuenta">
      <input message="tns:ObtenerEstadoCuentaIn"/>
      <output message="tns:ObtenerEstadoCuentaOut"/>
    </operation>
  </portType>

  <!-- ========== BINDING (SOAP 1.1, document/literal) ========== -->
  <binding name="BancoBinding" type="tns:BancoPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="ValidarSaldo">
      <soap:operation soapAction="${TNS}/ValidarSaldo"/>
      <input>
        <soap:header message="tns:CabeceraComercio" part="cabecera" use="literal"/>
        <soap:body use="literal"/>
      </input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="EjecutarTransferencia">
      <soap:operation soapAction="${TNS}/EjecutarTransferencia"/>
      <input>
        <soap:header message="tns:CabeceraComercio" part="cabecera" use="literal"/>
        <soap:body use="literal"/>
      </input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="ObtenerEstadoCuenta">
      <soap:operation soapAction="${TNS}/ObtenerEstadoCuenta"/>
      <input>
        <soap:header message="tns:CabeceraComercio" part="cabecera" use="literal"/>
        <soap:body use="literal"/>
      </input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>

  <!-- ========== SERVICIO ========== -->
  <service name="BancoService">
    <port name="BancoPort" binding="tns:BancoBinding">
      <soap:address location="${location}"/>
    </port>
  </service>
</definitions>`;
}

module.exports = { construirWsdl, TNS };