export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      adquisicion_organizacion: {
        Row: {
          actualizada_en: string | null
          adquirida_en: string
          cantidad_cupos: number | null
          curso_catalogo_id: string
          datos_historicos: Json
          estado: Database["public"]["Enums"]["estado_adquisicion"]
          id: string
          instalacion_compradora_ref: string
          instalacion_proveedora_ref: string
          oferta_catalogo_ref: string
          version_registro: number
          vigente_desde: string | null
          vigente_hasta: string | null
        }
        Insert: {
          actualizada_en?: string | null
          adquirida_en?: string
          cantidad_cupos?: number | null
          curso_catalogo_id: string
          datos_historicos: Json
          estado?: Database["public"]["Enums"]["estado_adquisicion"]
          id?: string
          instalacion_compradora_ref: string
          instalacion_proveedora_ref: string
          oferta_catalogo_ref: string
          version_registro?: number
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Update: {
          actualizada_en?: string | null
          adquirida_en?: string
          cantidad_cupos?: number | null
          curso_catalogo_id?: string
          datos_historicos?: Json
          estado?: Database["public"]["Enums"]["estado_adquisicion"]
          id?: string
          instalacion_compradora_ref?: string
          instalacion_proveedora_ref?: string
          oferta_catalogo_ref?: string
          version_registro?: number
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_adquisicion_organizacion_curso_catalogo_id_curso_catalogo"
            columns: ["curso_catalogo_id"]
            isOneToOne: false
            referencedRelation: "curso_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_tukuy: {
        Row: {
          accion: string
          actor_identidad_ref: string | null
          agente_usuario: string | null
          creada_en: string
          datos_historicos: Json | null
          direccion_ip: unknown
          evento_ref: string | null
          funcion_principal_ref: string | null
          id: number
          instalacion_organizacion_id: string
          membresia_principal_ref: string | null
          recurso_ref: string | null
          recurso_tipo: string
          resultado: Database["public"]["Enums"]["resultado_auditoria"]
        }
        Insert: {
          accion: string
          actor_identidad_ref?: string | null
          agente_usuario?: string | null
          creada_en?: string
          datos_historicos?: Json | null
          direccion_ip?: unknown
          evento_ref?: string | null
          funcion_principal_ref?: string | null
          id?: number
          instalacion_organizacion_id: string
          membresia_principal_ref?: string | null
          recurso_ref?: string | null
          recurso_tipo: string
          resultado: Database["public"]["Enums"]["resultado_auditoria"]
        }
        Update: {
          accion?: string
          actor_identidad_ref?: string | null
          agente_usuario?: string | null
          creada_en?: string
          datos_historicos?: Json | null
          direccion_ip?: unknown
          evento_ref?: string | null
          funcion_principal_ref?: string | null
          id?: number
          instalacion_organizacion_id?: string
          membresia_principal_ref?: string | null
          recurso_ref?: string | null
          recurso_tipo?: string
          resultado?: Database["public"]["Enums"]["resultado_auditoria"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_auditoria_tukuy_instalacion_organizacion_id_inst_35cd178f"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      carrera_catalogo: {
        Row: {
          activa: boolean
          codigo: string
          creado_en: string
          descripcion: string
          familia: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activa?: boolean
          codigo: string
          creado_en?: string
          descripcion?: string
          familia?: string
          id: string
          nombre: string
          orden?: number
        }
        Update: {
          activa?: boolean
          codigo?: string
          creado_en?: string
          descripcion?: string
          familia?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      carrera_interes_sugerido: {
        Row: {
          carrera_id: string
          interes_id: string
          peso: number
        }
        Insert: {
          carrera_id: string
          interes_id: string
          peso?: number
        }
        Update: {
          carrera_id?: string
          interes_id?: string
          peso?: number
        }
        Relationships: [
          {
            foreignKeyName: "carrera_interes_sugerido_carrera_id_fkey"
            columns: ["carrera_id"]
            isOneToOne: false
            referencedRelation: "carrera_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrera_interes_sugerido_interes_id_fkey"
            columns: ["interes_id"]
            isOneToOne: false
            referencedRelation: "interes_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      conexion_organizacion: {
        Row: {
          actualizada_en: string | null
          conexion_ref: string
          creada_en: string
          estado: Database["public"]["Enums"]["estado_conexion"]
          id: string
          instalacion_organizacion_id: string
          nombre_base_logico: string
          proveedor: string
          puerto: number
          region: string | null
          secreto_ref: string
          servidor_ref: string
          ultima_migracion_en: string | null
          ultimo_error: string | null
          verificada_en: string | null
          version_esquema: number
        }
        Insert: {
          actualizada_en?: string | null
          conexion_ref?: string
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_conexion"]
          id?: string
          instalacion_organizacion_id: string
          nombre_base_logico: string
          proveedor?: string
          puerto?: number
          region?: string | null
          secreto_ref: string
          servidor_ref: string
          ultima_migracion_en?: string | null
          ultimo_error?: string | null
          verificada_en?: string | null
          version_esquema: number
        }
        Update: {
          actualizada_en?: string | null
          conexion_ref?: string
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_conexion"]
          id?: string
          instalacion_organizacion_id?: string
          nombre_base_logico?: string
          proveedor?: string
          puerto?: number
          region?: string | null
          secreto_ref?: string
          servidor_ref?: string
          ultima_migracion_en?: string | null
          ultimo_error?: string | null
          verificada_en?: string | null
          version_esquema?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_conexion_organizacion_instalacion_organizacion_i_df314ab5"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: true
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_tukuy: {
        Row: {
          actualizada_en: string | null
          codigo_entorno: string
          creada_en: string
          estado: Database["public"]["Enums"]["estado_registro"]
          id: string
          mantenimiento_activo: boolean
          nombre: string
          version_aplicacion: string
          version_esquema_secundario_objetivo: number
        }
        Insert: {
          actualizada_en?: string | null
          codigo_entorno: string
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_registro"]
          id?: string
          mantenimiento_activo?: boolean
          nombre: string
          version_aplicacion: string
          version_esquema_secundario_objetivo: number
        }
        Update: {
          actualizada_en?: string | null
          codigo_entorno?: string
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_registro"]
          id?: string
          mantenimiento_activo?: boolean
          nombre?: string
          version_aplicacion?: string
          version_esquema_secundario_objetivo?: number
        }
        Relationships: []
      }
      curso_catalogo: {
        Row: {
          actualizado_en: string | null
          codigo: string
          creado_en: string
          curso_secundario_ref: string
          datos_historicos: Json
          duracion_minutos: number | null
          estado_publicacion: Database["public"]["Enums"]["estado_publicacion_catalogo"]
          id: string
          imagen_publica_ref: string | null
          instalacion_proveedora_id: string
          modalidad: string
          publicado_en: string | null
          resumen: string | null
          retirado_en: string | null
          titulo: string
          version_publicada: number
        }
        Insert: {
          actualizado_en?: string | null
          codigo: string
          creado_en?: string
          curso_secundario_ref: string
          datos_historicos: Json
          duracion_minutos?: number | null
          estado_publicacion?: Database["public"]["Enums"]["estado_publicacion_catalogo"]
          id?: string
          imagen_publica_ref?: string | null
          instalacion_proveedora_id: string
          modalidad: string
          publicado_en?: string | null
          resumen?: string | null
          retirado_en?: string | null
          titulo: string
          version_publicada?: number
        }
        Update: {
          actualizado_en?: string | null
          codigo?: string
          creado_en?: string
          curso_secundario_ref?: string
          datos_historicos?: Json
          duracion_minutos?: number | null
          estado_publicacion?: Database["public"]["Enums"]["estado_publicacion_catalogo"]
          id?: string
          imagen_publica_ref?: string | null
          instalacion_proveedora_id?: string
          modalidad?: string
          publicado_en?: string | null
          resumen?: string | null
          retirado_en?: string | null
          titulo?: string
          version_publicada?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_curso_catalogo_instalacion_proveedora_id_instala_540f6e7e"
            columns: ["instalacion_proveedora_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_principal: {
        Row: {
          actualizada_en: string | null
          codigo: string
          creada_en: string
          estado: string
          id: number
          nombre_comercial: string | null
          numero_documento_fiscal: string | null
          pais_codigo: string
          razon_social: string
          tipo_documento_fiscal: string | null
          version_registro: number
        }
        Insert: {
          actualizada_en?: string | null
          codigo: string
          creada_en?: string
          estado?: string
          id?: never
          nombre_comercial?: string | null
          numero_documento_fiscal?: string | null
          pais_codigo?: string
          razon_social: string
          tipo_documento_fiscal?: string | null
          version_registro?: number
        }
        Update: {
          actualizada_en?: string | null
          codigo?: string
          creada_en?: string
          estado?: string
          id?: never
          nombre_comercial?: string | null
          numero_documento_fiscal?: string | null
          pais_codigo?: string
          razon_social?: string
          tipo_documento_fiscal?: string | null
          version_registro?: number
        }
        Relationships: []
      }
      empresa_sistema: {
        Row: {
          actualizada_en: string | null
          codigo_sistema: string
          creada_en: string
          empresa_principal_id: number
          estado: string
          habilitada_en: string | null
          id: string
          tenant_principal_id: string
          version_registro: number
        }
        Insert: {
          actualizada_en?: string | null
          codigo_sistema?: string
          creada_en?: string
          empresa_principal_id: number
          estado?: string
          habilitada_en?: string | null
          id?: string
          tenant_principal_id: string
          version_registro?: number
        }
        Update: {
          actualizada_en?: string | null
          codigo_sistema?: string
          creada_en?: string
          empresa_principal_id?: number
          estado?: string
          habilitada_en?: string | null
          id?: string
          tenant_principal_id?: string
          version_registro?: number
        }
        Relationships: [
          {
            foreignKeyName: "empresa_sistema_empresa_principal_id_fkey"
            columns: ["empresa_principal_id"]
            isOneToOne: false
            referencedRelation: "empresa_principal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_sistema_tenant_principal_id_fkey"
            columns: ["tenant_principal_id"]
            isOneToOne: false
            referencedRelation: "tenant_principal"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_externo_procesado: {
        Row: {
          estado: Database["public"]["Enums"]["estado_procesamiento_evento"]
          evento_externo_id: string
          huella_contenido: string
          id: string
          instalacion_organizacion_id: string
          origen: Database["public"]["Enums"]["origen_evento_externo"]
          procesado_en: string | null
          recibido_en: string
          tipo_evento: string
          ultimo_error: string | null
          version_evento: number
        }
        Insert: {
          estado: Database["public"]["Enums"]["estado_procesamiento_evento"]
          evento_externo_id: string
          huella_contenido: string
          id?: string
          instalacion_organizacion_id: string
          origen: Database["public"]["Enums"]["origen_evento_externo"]
          procesado_en?: string | null
          recibido_en?: string
          tipo_evento: string
          ultimo_error?: string | null
          version_evento: number
        }
        Update: {
          estado?: Database["public"]["Enums"]["estado_procesamiento_evento"]
          evento_externo_id?: string
          huella_contenido?: string
          id?: string
          instalacion_organizacion_id?: string
          origen?: Database["public"]["Enums"]["origen_evento_externo"]
          procesado_en?: string | null
          recibido_en?: string
          tipo_evento?: string
          ultimo_error?: string | null
          version_evento?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_evento_externo_procesado_instalacion_organizacio_f08813dd"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_pendiente: {
        Row: {
          agregado_ref: string
          agregado_tipo: string
          cantidad_intentos: number
          creado_en: string
          datos_evento: Json
          estado: Database["public"]["Enums"]["estado_procesamiento_evento"]
          evento_id: string
          id: string
          instalacion_organizacion_id: string | null
          ocurrido_en: string
          procesado_en: string | null
          siguiente_intento_en: string | null
          tipo_evento: string
          ultimo_error: string | null
          version_evento: number
        }
        Insert: {
          agregado_ref: string
          agregado_tipo: string
          cantidad_intentos?: number
          creado_en?: string
          datos_evento: Json
          estado?: Database["public"]["Enums"]["estado_procesamiento_evento"]
          evento_id: string
          id?: string
          instalacion_organizacion_id?: string | null
          ocurrido_en: string
          procesado_en?: string | null
          siguiente_intento_en?: string | null
          tipo_evento: string
          ultimo_error?: string | null
          version_evento: number
        }
        Update: {
          agregado_ref?: string
          agregado_tipo?: string
          cantidad_intentos?: number
          creado_en?: string
          datos_evento?: Json
          estado?: Database["public"]["Enums"]["estado_procesamiento_evento"]
          evento_id?: string
          id?: string
          instalacion_organizacion_id?: string | null
          ocurrido_en?: string
          procesado_en?: string | null
          siguiente_intento_en?: string | null
          tipo_evento?: string
          ultimo_error?: string | null
          version_evento?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_evento_pendiente_instalacion_organizacion_id_ins_2509727d"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      funcion_permiso_principal: {
        Row: {
          creado_en: string
          efecto: string
          funcion_principal_id: string
          permiso_principal_id: string
        }
        Insert: {
          creado_en?: string
          efecto: string
          funcion_principal_id: string
          permiso_principal_id: string
        }
        Update: {
          creado_en?: string
          efecto?: string
          funcion_principal_id?: string
          permiso_principal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcion_permiso_principal_funcion_principal_id_fkey"
            columns: ["funcion_principal_id"]
            isOneToOne: false
            referencedRelation: "funcion_principal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcion_permiso_principal_permiso_principal_id_fkey"
            columns: ["permiso_principal_id"]
            isOneToOne: false
            referencedRelation: "permiso_principal"
            referencedColumns: ["id"]
          },
        ]
      }
      funcion_principal: {
        Row: {
          actualizada_en: string
          alcance: Json
          ambito_docencia: string | null
          codigo: string
          creada_en: string
          es_principal: boolean
          estado: string
          id: string
          membresia_principal_id: string
          perfil_principal_id: string
          version_registro: number
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          actualizada_en?: string
          alcance?: Json
          ambito_docencia?: string | null
          codigo: string
          creada_en?: string
          es_principal?: boolean
          estado?: string
          id?: string
          membresia_principal_id: string
          perfil_principal_id: string
          version_registro?: number
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Update: {
          actualizada_en?: string
          alcance?: Json
          ambito_docencia?: string | null
          codigo?: string
          creada_en?: string
          es_principal?: boolean
          estado?: string
          id?: string
          membresia_principal_id?: string
          perfil_principal_id?: string
          version_registro?: number
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcion_principal_membresia_principal_id_fkey"
            columns: ["membresia_principal_id"]
            isOneToOne: false
            referencedRelation: "membresia_principal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcion_principal_perfil_principal_id_fkey"
            columns: ["perfil_principal_id"]
            isOneToOne: false
            referencedRelation: "perfil_principal"
            referencedColumns: ["id"]
          },
        ]
      }
      identidad_interes: {
        Row: {
          creado_en: string
          fuente: string
          identidad_id: string
          interes_id: string
        }
        Insert: {
          creado_en?: string
          fuente?: string
          identidad_id: string
          interes_id: string
        }
        Update: {
          creado_en?: string
          fuente?: string
          identidad_id?: string
          interes_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identidad_interes_identidad_id_fkey"
            columns: ["identidad_id"]
            isOneToOne: false
            referencedRelation: "identidad_principal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identidad_interes_interes_id_fkey"
            columns: ["interes_id"]
            isOneToOne: false
            referencedRelation: "interes_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      identidad_perfil_aprendizaje: {
        Row: {
          actualizado_en: string
          carrera_id: string | null
          identidad_id: string
          onboarding_completado_en: string | null
          situacion: string
        }
        Insert: {
          actualizado_en?: string
          carrera_id?: string | null
          identidad_id: string
          onboarding_completado_en?: string | null
          situacion?: string
        }
        Update: {
          actualizado_en?: string
          carrera_id?: string | null
          identidad_id?: string
          onboarding_completado_en?: string | null
          situacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "identidad_perfil_aprendizaje_carrera_id_fkey"
            columns: ["carrera_id"]
            isOneToOne: false
            referencedRelation: "carrera_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identidad_perfil_aprendizaje_identidad_id_fkey"
            columns: ["identidad_id"]
            isOneToOne: true
            referencedRelation: "identidad_principal"
            referencedColumns: ["id"]
          },
        ]
      }
      identidad_principal: {
        Row: {
          actualizada_en: string
          apellidos: string
          auth_usuario_ref: string
          avatar_url: string | null
          correo: string | null
          creada_en: string
          estado: string
          fecha_nacimiento: string | null
          id: string
          nombre_mostrar: string | null
          nombres: string
          preferencias: Json
          proveedor: string
          telefono: string | null
          ultimo_acceso_en: string | null
          version_registro: number
        }
        Insert: {
          actualizada_en?: string
          apellidos?: string
          auth_usuario_ref: string
          avatar_url?: string | null
          correo?: string | null
          creada_en?: string
          estado?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre_mostrar?: string | null
          nombres?: string
          preferencias?: Json
          proveedor?: string
          telefono?: string | null
          ultimo_acceso_en?: string | null
          version_registro?: number
        }
        Update: {
          actualizada_en?: string
          apellidos?: string
          auth_usuario_ref?: string
          avatar_url?: string | null
          correo?: string | null
          creada_en?: string
          estado?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre_mostrar?: string | null
          nombres?: string
          preferencias?: Json
          proveedor?: string
          telefono?: string | null
          ultimo_acceso_en?: string | null
          version_registro?: number
        }
        Relationships: []
      }
      indice_certificado_publico: {
        Row: {
          actualizado_en: string
          algoritmo_huella: string
          certificado_secundario_ref: string
          codigo_verificacion: string
          conexion_organizacion_id: string
          curso_historico: string
          documento_secundario_ref: string
          emitido_en: string
          estado_publico: Database["public"]["Enums"]["estado_certificado_publico"]
          huella_documento: string
          id: string
          instalacion_organizacion_ref: string
          organizacion_historica: string
          revocado_en: string | null
          titular_historico: string
          version_evento: number
        }
        Insert: {
          actualizado_en: string
          algoritmo_huella?: string
          certificado_secundario_ref: string
          codigo_verificacion: string
          conexion_organizacion_id: string
          curso_historico: string
          documento_secundario_ref: string
          emitido_en: string
          estado_publico: Database["public"]["Enums"]["estado_certificado_publico"]
          huella_documento: string
          id?: string
          instalacion_organizacion_ref: string
          organizacion_historica: string
          revocado_en?: string | null
          titular_historico: string
          version_evento: number
        }
        Update: {
          actualizado_en?: string
          algoritmo_huella?: string
          certificado_secundario_ref?: string
          codigo_verificacion?: string
          conexion_organizacion_id?: string
          curso_historico?: string
          documento_secundario_ref?: string
          emitido_en?: string
          estado_publico?: Database["public"]["Enums"]["estado_certificado_publico"]
          huella_documento?: string
          id?: string
          instalacion_organizacion_ref?: string
          organizacion_historica?: string
          revocado_en?: string | null
          titular_historico?: string
          version_evento?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_indice_certificado_publico_conexion_organizacion_7a4484aa"
            columns: ["conexion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "conexion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      instalacion_organizacion: {
        Row: {
          actualizada_en: string | null
          autorizacion_sincronizada_en: string | null
          clasificacion: string
          codigo_sistema: string
          creada_en: string
          empresa_principal_ref: number
          empresa_sistema_ref: string
          estado: Database["public"]["Enums"]["estado_instalacion"]
          facturable: boolean
          habilitada_en: string | null
          id: string
          nombre_organizacion: string
          suspendida_en: string | null
          tenant_ref: string
          version_autorizacion_conocida: number
          version_registro: number
          vigencia_indefinida: boolean
          zona_horaria: string
        }
        Insert: {
          actualizada_en?: string | null
          autorizacion_sincronizada_en?: string | null
          clasificacion?: string
          codigo_sistema?: string
          creada_en?: string
          empresa_principal_ref: number
          empresa_sistema_ref: string
          estado?: Database["public"]["Enums"]["estado_instalacion"]
          facturable?: boolean
          habilitada_en?: string | null
          id?: string
          nombre_organizacion: string
          suspendida_en?: string | null
          tenant_ref: string
          version_autorizacion_conocida?: number
          version_registro?: number
          vigencia_indefinida?: boolean
          zona_horaria?: string
        }
        Update: {
          actualizada_en?: string | null
          autorizacion_sincronizada_en?: string | null
          clasificacion?: string
          codigo_sistema?: string
          creada_en?: string
          empresa_principal_ref?: number
          empresa_sistema_ref?: string
          estado?: Database["public"]["Enums"]["estado_instalacion"]
          facturable?: boolean
          habilitada_en?: string | null
          id?: string
          nombre_organizacion?: string
          suspendida_en?: string | null
          tenant_ref?: string
          version_autorizacion_conocida?: number
          version_registro?: number
          vigencia_indefinida?: boolean
          zona_horaria?: string
        }
        Relationships: []
      }
      interes_catalogo: {
        Row: {
          activo: boolean
          codigo: string
          color: string
          creado_en: string
          descripcion: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          codigo: string
          color?: string
          creado_en?: string
          descripcion?: string
          id: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          codigo?: string
          color?: string
          creado_en?: string
          descripcion?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      limite_plan: {
        Row: {
          codigo_recurso: string
          id: string
          limite: number
          plan_saas_id: string
          unidad: string
        }
        Insert: {
          codigo_recurso: string
          id?: string
          limite: number
          plan_saas_id: string
          unidad: string
        }
        Update: {
          codigo_recurso?: string
          id?: string
          limite?: number
          plan_saas_id?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_limite_plan_plan_saas_id_plan_saas"
            columns: ["plan_saas_id"]
            isOneToOne: false
            referencedRelation: "plan_saas"
            referencedColumns: ["id"]
          },
        ]
      }
      membresia_principal: {
        Row: {
          actualizada_en: string
          alcance_tipo: string
          cargo: string | null
          codigo: string | null
          creada_en: string
          empresa_principal_ref: number | null
          empresa_sistema_ref: string | null
          estado: string
          id: string
          identidad_principal_id: string
          instalacion_organizacion_ref: string | null
          tenant_ref: string | null
          version_autorizacion: number
          version_registro: number
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          actualizada_en?: string
          alcance_tipo?: string
          cargo?: string | null
          codigo?: string | null
          creada_en?: string
          empresa_principal_ref?: number | null
          empresa_sistema_ref?: string | null
          estado?: string
          id?: string
          identidad_principal_id: string
          instalacion_organizacion_ref?: string | null
          tenant_ref?: string | null
          version_autorizacion?: number
          version_registro?: number
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Update: {
          actualizada_en?: string
          alcance_tipo?: string
          cargo?: string | null
          codigo?: string | null
          creada_en?: string
          empresa_principal_ref?: number | null
          empresa_sistema_ref?: string | null
          estado?: string
          id?: string
          identidad_principal_id?: string
          instalacion_organizacion_ref?: string | null
          tenant_ref?: string | null
          version_autorizacion?: number
          version_registro?: number
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membresia_principal_identidad_principal_id_fkey"
            columns: ["identidad_principal_id"]
            isOneToOne: false
            referencedRelation: "identidad_principal"
            referencedColumns: ["id"]
          },
        ]
      }
      modulo_habilitado_organizacion: {
        Row: {
          configuracion: Json | null
          deshabilitado_en: string | null
          estado: Database["public"]["Enums"]["estado_registro"]
          habilitado_en: string
          id: string
          instalacion_organizacion_id: string
          modulo_sistema_ref: string
        }
        Insert: {
          configuracion?: Json | null
          deshabilitado_en?: string | null
          estado?: Database["public"]["Enums"]["estado_registro"]
          habilitado_en?: string
          id?: string
          instalacion_organizacion_id: string
          modulo_sistema_ref: string
        }
        Update: {
          configuracion?: Json | null
          deshabilitado_en?: string | null
          estado?: Database["public"]["Enums"]["estado_registro"]
          habilitado_en?: string
          id?: string
          instalacion_organizacion_id?: string
          modulo_sistema_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_modulo_habilitado_organizacion_instalacion_organ_976aeda4"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      modulo_sistema_catalogo: {
        Row: {
          actualizado_en: string | null
          codigo: string
          creado_en: string
          descripcion: string | null
          estado: string
          id: string
          nombre: string
          orden: number
          portal: string
        }
        Insert: {
          actualizado_en?: string | null
          codigo: string
          creado_en?: string
          descripcion?: string | null
          estado?: string
          id?: string
          nombre: string
          orden?: number
          portal: string
        }
        Update: {
          actualizado_en?: string | null
          codigo?: string
          creado_en?: string
          descripcion?: string | null
          estado?: string
          id?: string
          nombre?: string
          orden?: number
          portal?: string
        }
        Relationships: []
      }
      oferta_catalogo: {
        Row: {
          actualizada_en: string | null
          cantidad_cupos: number | null
          creada_en: string
          curso_catalogo_id: string
          dias_vigencia: number | null
          estado: Database["public"]["Enums"]["estado_registro"]
          id: string
          moneda: string | null
          precio_centavos: number | null
          tipo: Database["public"]["Enums"]["tipo_oferta_catalogo"]
          vigente_desde: string | null
          vigente_hasta: string | null
        }
        Insert: {
          actualizada_en?: string | null
          cantidad_cupos?: number | null
          creada_en?: string
          curso_catalogo_id: string
          dias_vigencia?: number | null
          estado?: Database["public"]["Enums"]["estado_registro"]
          id?: string
          moneda?: string | null
          precio_centavos?: number | null
          tipo: Database["public"]["Enums"]["tipo_oferta_catalogo"]
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Update: {
          actualizada_en?: string | null
          cantidad_cupos?: number | null
          creada_en?: string
          curso_catalogo_id?: string
          dias_vigencia?: number | null
          estado?: Database["public"]["Enums"]["estado_registro"]
          id?: string
          moneda?: string | null
          precio_centavos?: number | null
          tipo?: Database["public"]["Enums"]["tipo_oferta_catalogo"]
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_oferta_catalogo_curso_catalogo_id_curso_catalogo"
            columns: ["curso_catalogo_id"]
            isOneToOne: false
            referencedRelation: "curso_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_adquisicion_catalogo: {
        Row: {
          actualizada_en: string | null
          adquisicion_organizacion_id: string
          creada_en: string
          descuento_centavos: number
          estado: Database["public"]["Enums"]["estado_orden_saas"]
          expira_en: string | null
          id: string
          impuesto_centavos: number
          moneda: string
          numero: string
          pagada_en: string | null
          subtotal_centavos: number
          total_centavos: number
          version_registro: number
        }
        Insert: {
          actualizada_en?: string | null
          adquisicion_organizacion_id: string
          creada_en?: string
          descuento_centavos?: number
          estado?: Database["public"]["Enums"]["estado_orden_saas"]
          expira_en?: string | null
          id?: string
          impuesto_centavos?: number
          moneda: string
          numero: string
          pagada_en?: string | null
          subtotal_centavos: number
          total_centavos: number
          version_registro?: number
        }
        Update: {
          actualizada_en?: string | null
          adquisicion_organizacion_id?: string
          creada_en?: string
          descuento_centavos?: number
          estado?: Database["public"]["Enums"]["estado_orden_saas"]
          expira_en?: string | null
          id?: string
          impuesto_centavos?: number
          moneda?: string
          numero?: string
          pagada_en?: string | null
          subtotal_centavos?: number
          total_centavos?: number
          version_registro?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_orden_adquisicion_catalogo_adquisicion_organizac_a4f9bc9a"
            columns: ["adquisicion_organizacion_id"]
            isOneToOne: true
            referencedRelation: "adquisicion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_saas: {
        Row: {
          actualizada_en: string | null
          concepto: string
          creada_en: string
          descuento_centavos: number
          estado: Database["public"]["Enums"]["estado_orden_saas"]
          expira_en: string | null
          id: string
          impuesto_centavos: number
          moneda: string
          numero: string
          pagada_en: string | null
          subtotal_centavos: number
          suscripcion_organizacion_id: string
          total_centavos: number
          version_registro: number
        }
        Insert: {
          actualizada_en?: string | null
          concepto: string
          creada_en?: string
          descuento_centavos?: number
          estado?: Database["public"]["Enums"]["estado_orden_saas"]
          expira_en?: string | null
          id?: string
          impuesto_centavos?: number
          moneda: string
          numero: string
          pagada_en?: string | null
          subtotal_centavos: number
          suscripcion_organizacion_id: string
          total_centavos: number
          version_registro?: number
        }
        Update: {
          actualizada_en?: string | null
          concepto?: string
          creada_en?: string
          descuento_centavos?: number
          estado?: Database["public"]["Enums"]["estado_orden_saas"]
          expira_en?: string | null
          id?: string
          impuesto_centavos?: number
          moneda?: string
          numero?: string
          pagada_en?: string | null
          subtotal_centavos?: number
          suscripcion_organizacion_id?: string
          total_centavos?: number
          version_registro?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_orden_saas_suscripcion_organizacion_id_suscripci_ce44eca4"
            columns: ["suscripcion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "suscripcion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_asignacion: {
        Row: {
          actualizado_en: string
          asignados: number
          completados: number
          creada_en: string
          creado_en: string
          curso_id: string
          curso_titulo: string
          destino_label: string
          destino_unidad_id: string | null
          estado: string
          id: string
          incluir_descendientes: boolean
          instalacion_organizacion_id: string
          obligatorio: boolean
          vence: string
        }
        Insert: {
          actualizado_en?: string
          asignados?: number
          completados?: number
          creada_en?: string
          creado_en?: string
          curso_id?: string
          curso_titulo: string
          destino_label?: string
          destino_unidad_id?: string | null
          estado?: string
          id: string
          incluir_descendientes?: boolean
          instalacion_organizacion_id: string
          obligatorio?: boolean
          vence?: string
        }
        Update: {
          actualizado_en?: string
          asignados?: number
          completados?: number
          creada_en?: string
          creado_en?: string
          curso_id?: string
          curso_titulo?: string
          destino_label?: string
          destino_unidad_id?: string | null
          estado?: string
          id?: string
          incluir_descendientes?: boolean
          instalacion_organizacion_id?: string
          obligatorio?: boolean
          vence?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_asignacion_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_asignacion_perfil: {
        Row: {
          actualizado_en: string
          creado_en: string
          es_principal: boolean
          estado: string
          id: string
          identidad_ref: string
          incluir_descendientes: boolean
          instalacion_organizacion_id: string
          perfil_id: string
          sede_ids: Json
          unidad_ids: Json
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          es_principal?: boolean
          estado?: string
          id: string
          identidad_ref: string
          incluir_descendientes?: boolean
          instalacion_organizacion_id: string
          perfil_id: string
          sede_ids?: Json
          unidad_ids?: Json
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          es_principal?: boolean
          estado?: string
          id?: string
          identidad_ref?: string
          incluir_descendientes?: boolean
          instalacion_organizacion_id?: string
          perfil_id?: string
          sede_ids?: Json
          unidad_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "org_asignacion_perfil_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_asignacion_perfil_instalacion_organizacion_id_perfil_i_fkey"
            columns: ["instalacion_organizacion_id", "perfil_id"]
            isOneToOne: false
            referencedRelation: "org_perfil"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
        ]
      }
      org_categoria_curso: {
        Row: {
          actualizado_en: string
          color: string
          creado_en: string
          descripcion: string
          estado: string
          id: string
          instalacion_organizacion_id: string
          nombre: string
          orden: number
          seleccionable_como_interes: boolean
          visible_en_catalogo: boolean
        }
        Insert: {
          actualizado_en?: string
          color?: string
          creado_en?: string
          descripcion?: string
          estado?: string
          id: string
          instalacion_organizacion_id: string
          nombre: string
          orden?: number
          seleccionable_como_interes?: boolean
          visible_en_catalogo?: boolean
        }
        Update: {
          actualizado_en?: string
          color?: string
          creado_en?: string
          descripcion?: string
          estado?: string
          id?: string
          instalacion_organizacion_id?: string
          nombre?: string
          orden?: number
          seleccionable_como_interes?: boolean
          visible_en_catalogo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_categoria_curso_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_config_certificados: {
        Row: {
          actualizado_en: string
          creado_en: string
          docentes_pueden_configurar: boolean
          instalacion_organizacion_id: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          docentes_pueden_configurar?: boolean
          instalacion_organizacion_id: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          docentes_pueden_configurar?: boolean
          instalacion_organizacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_config_certificados_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: true
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_estructura: {
        Row: {
          actualizado_en: string
          creado_en: string
          descripcion: string | null
          es_sistema: boolean
          estado: string
          id: string
          instalacion_organizacion_id: string
          modo_jerarquia: string
          nombre: string
          tipo: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          estado?: string
          id: string
          instalacion_organizacion_id: string
          modo_jerarquia?: string
          nombre: string
          tipo: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          estado?: string
          id?: string
          instalacion_organizacion_id?: string
          modo_jerarquia?: string
          nombre?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_estructura_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_excepcion_permiso: {
        Row: {
          actualizado_en: string
          creado_en: string
          efecto: string
          id: string
          identidad_ref: string
          instalacion_organizacion_id: string
          motivo: string
          permiso_codigo: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          efecto: string
          id: string
          identidad_ref: string
          instalacion_organizacion_id: string
          motivo?: string
          permiso_codigo: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          efecto?: string
          id?: string
          identidad_ref?: string
          instalacion_organizacion_id?: string
          motivo?: string
          permiso_codigo?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_excepcion_permiso_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_fondo_certificado: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          fondo_url: string
          id: string
          instalacion_organizacion_id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          fondo_url: string
          id?: string
          instalacion_organizacion_id: string
          nombre?: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          fondo_url?: string
          id?: string
          instalacion_organizacion_id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_fondo_certificado_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_nivel_estructura: {
        Row: {
          actualizado_en: string
          creado_en: string
          estado: string
          estructura_id: string
          id: string
          instalacion_organizacion_id: string
          nombre: string
          orden: number
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          estado?: string
          estructura_id: string
          id: string
          instalacion_organizacion_id: string
          nombre: string
          orden: number
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          estado?: string
          estructura_id?: string
          id?: string
          instalacion_organizacion_id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_nivel_estructura_instalacion_organizacion_id_estructur_fkey"
            columns: ["instalacion_organizacion_id", "estructura_id"]
            isOneToOne: false
            referencedRelation: "org_estructura"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
        ]
      }
      org_perfil: {
        Row: {
          actualizado_en: string
          alcance_defecto: string
          creado_en: string
          descripcion: string
          es_sistema: boolean
          estado: string
          id: string
          instalacion_organizacion_id: string
          nivel_autoridad: number
          nombre: string
          permisos: Json
          plantilla: string
          ruta_inicial: string
          tipo: string
        }
        Insert: {
          actualizado_en?: string
          alcance_defecto?: string
          creado_en?: string
          descripcion?: string
          es_sistema?: boolean
          estado?: string
          id: string
          instalacion_organizacion_id: string
          nivel_autoridad?: number
          nombre: string
          permisos?: Json
          plantilla?: string
          ruta_inicial?: string
          tipo?: string
        }
        Update: {
          actualizado_en?: string
          alcance_defecto?: string
          creado_en?: string
          descripcion?: string
          es_sistema?: boolean
          estado?: string
          id?: string
          instalacion_organizacion_id?: string
          nivel_autoridad?: number
          nombre?: string
          permisos?: Json
          plantilla?: string
          ruta_inicial?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_perfil_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_plantilla_certificado: {
        Row: {
          activa: boolean
          actualizado_en: string
          alcance: string
          autor_identidad_ref: string | null
          creado_en: string
          es_default: boolean
          fondo_especificacion: string
          fondo_url: string
          id: string
          instalacion_organizacion_id: string
          layout: Json
          logo_override_url: string | null
          nombre: string
          usar_logo_entidad: boolean
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          alcance?: string
          autor_identidad_ref?: string | null
          creado_en?: string
          es_default?: boolean
          fondo_especificacion?: string
          fondo_url?: string
          id?: string
          instalacion_organizacion_id: string
          layout?: Json
          logo_override_url?: string | null
          nombre: string
          usar_logo_entidad?: boolean
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          alcance?: string
          autor_identidad_ref?: string | null
          creado_en?: string
          es_default?: boolean
          fondo_especificacion?: string
          fondo_url?: string
          id?: string
          instalacion_organizacion_id?: string
          layout?: Json
          logo_override_url?: string | null
          nombre?: string
          usar_logo_entidad?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_plantilla_certificado_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_politica_incorporacion: {
        Row: {
          actualizado_en: string
          capacidad_maxima: number | null
          creado_en: string
          especialidades_permitidas: Json
          estado: string
          id: string
          instalacion_organizacion_id: string
          modalidad: string
          nombre: string
          requiere_colegiatura_activa: boolean
        }
        Insert: {
          actualizado_en?: string
          capacidad_maxima?: number | null
          creado_en?: string
          especialidades_permitidas?: Json
          estado?: string
          id: string
          instalacion_organizacion_id: string
          modalidad: string
          nombre: string
          requiere_colegiatura_activa?: boolean
        }
        Update: {
          actualizado_en?: string
          capacidad_maxima?: number | null
          creado_en?: string
          especialidades_permitidas?: Json
          estado?: string
          id?: string
          instalacion_organizacion_id?: string
          modalidad?: string
          nombre?: string
          requiere_colegiatura_activa?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_politica_incorporacion_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_presencia: {
        Row: {
          actualizado_en: string
          ciudad: string
          correo_contacto: string
          creado_en: string
          descripcion: string
          descripcion_corta: string
          dominio: string
          etiquetas: Json
          instalacion_organizacion_id: string
          logo_url: string
          nombre_publico: string
          portada_url: string
          region: string
          requiere_dni_enrolamiento: boolean
          restringir_dominio: boolean
          ruc: string
          sector: string
          sitio_web: string
          slug: string
          tipo: string
          verificada: boolean
          zona_horaria: string
        }
        Insert: {
          actualizado_en?: string
          ciudad?: string
          correo_contacto?: string
          creado_en?: string
          descripcion?: string
          descripcion_corta?: string
          dominio?: string
          etiquetas?: Json
          instalacion_organizacion_id: string
          logo_url?: string
          nombre_publico?: string
          portada_url?: string
          region?: string
          requiere_dni_enrolamiento?: boolean
          restringir_dominio?: boolean
          ruc?: string
          sector?: string
          sitio_web?: string
          slug?: string
          tipo?: string
          verificada?: boolean
          zona_horaria?: string
        }
        Update: {
          actualizado_en?: string
          ciudad?: string
          correo_contacto?: string
          creado_en?: string
          descripcion?: string
          descripcion_corta?: string
          dominio?: string
          etiquetas?: Json
          instalacion_organizacion_id?: string
          logo_url?: string
          nombre_publico?: string
          portada_url?: string
          region?: string
          requiere_dni_enrolamiento?: boolean
          restringir_dominio?: boolean
          ruc?: string
          sector?: string
          sitio_web?: string
          slug?: string
          tipo?: string
          verificada?: boolean
          zona_horaria?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_presencia_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: true
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_regla_acceso_curso: {
        Row: {
          actualizado_en: string
          creado_en: string
          cupo: number | null
          curso_id: string
          curso_titulo: string
          estado: string
          id: string
          incluir_descendientes: boolean
          instalacion_organizacion_id: string
          modalidad: string
          publico: string
          publico_ids: Json
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          cupo?: number | null
          curso_id: string
          curso_titulo?: string
          estado?: string
          id: string
          incluir_descendientes?: boolean
          instalacion_organizacion_id: string
          modalidad?: string
          publico?: string
          publico_ids?: Json
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          cupo?: number | null
          curso_id?: string
          curso_titulo?: string
          estado?: string
          id?: string
          incluir_descendientes?: boolean
          instalacion_organizacion_id?: string
          modalidad?: string
          publico?: string
          publico_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "org_regla_acceso_curso_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_ruta: {
        Row: {
          actualizado_en: string
          alcance: string
          certificado: boolean
          creado_en: string
          cursos_count: number
          cursos_seleccionados: Json
          descripcion: string
          descuento_aplica_a: string | null
          descuento_area: string | null
          descuento_interno: number | null
          descuentos: Json
          destino_area: string | null
          estado: string
          gratuito: boolean
          id: string
          imagen: string
          instalacion_organizacion_id: string
          moneda: string
          nombre: string
          politica_descuentos: Json | null
          precio: number | null
          progreso: number
          usuarios: number
        }
        Insert: {
          actualizado_en?: string
          alcance?: string
          certificado?: boolean
          creado_en?: string
          cursos_count?: number
          cursos_seleccionados?: Json
          descripcion?: string
          descuento_aplica_a?: string | null
          descuento_area?: string | null
          descuento_interno?: number | null
          descuentos?: Json
          destino_area?: string | null
          estado?: string
          gratuito?: boolean
          id: string
          imagen?: string
          instalacion_organizacion_id: string
          moneda?: string
          nombre: string
          politica_descuentos?: Json | null
          precio?: number | null
          progreso?: number
          usuarios?: number
        }
        Update: {
          actualizado_en?: string
          alcance?: string
          certificado?: boolean
          creado_en?: string
          cursos_count?: number
          cursos_seleccionados?: Json
          descripcion?: string
          descuento_aplica_a?: string | null
          descuento_area?: string | null
          descuento_interno?: number | null
          descuentos?: Json
          destino_area?: string | null
          estado?: string
          gratuito?: boolean
          id?: string
          imagen?: string
          instalacion_organizacion_id?: string
          moneda?: string
          nombre?: string
          politica_descuentos?: Json | null
          precio?: number | null
          progreso?: number
          usuarios?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_ruta_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sede: {
        Row: {
          actualizado_en: string
          areas: number
          ciudad: string
          creado_en: string
          estado: string
          id: string
          instalacion_organizacion_id: string
          nombre: string
          usuarios: number
        }
        Insert: {
          actualizado_en?: string
          areas?: number
          ciudad?: string
          creado_en?: string
          estado?: string
          id: string
          instalacion_organizacion_id: string
          nombre: string
          usuarios?: number
        }
        Update: {
          actualizado_en?: string
          areas?: number
          ciudad?: string
          creado_en?: string
          estado?: string
          id?: string
          instalacion_organizacion_id?: string
          nombre?: string
          usuarios?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_sede_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tipo_unidad: {
        Row: {
          actualizado_en: string
          color: string
          creado_en: string
          descripcion: string | null
          estado: string
          id: string
          instalacion_organizacion_id: string
          nombre_plural: string
          nombre_singular: string
          permite_subunidades: boolean
        }
        Insert: {
          actualizado_en?: string
          color?: string
          creado_en?: string
          descripcion?: string | null
          estado?: string
          id: string
          instalacion_organizacion_id: string
          nombre_plural: string
          nombre_singular: string
          permite_subunidades?: boolean
        }
        Update: {
          actualizado_en?: string
          color?: string
          creado_en?: string
          descripcion?: string | null
          estado?: string
          id?: string
          instalacion_organizacion_id?: string
          nombre_plural?: string
          nombre_singular?: string
          permite_subunidades?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_tipo_unidad_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      org_unidad: {
        Row: {
          actualizado_en: string
          codigo: string | null
          codigo_sistema: string | null
          creado_en: string
          descripcion: string | null
          es_sistema: boolean
          estado: string
          estructura_id: string | null
          id: string
          instalacion_organizacion_id: string
          nivel_id: string | null
          nombre: string
          orden: number
          permite_subunidades: boolean | null
          politica_incorporacion_id: string | null
          responsable_identidad_ref: string | null
          tipo_unidad_id: string
          unidad_padre_id: string | null
        }
        Insert: {
          actualizado_en?: string
          codigo?: string | null
          codigo_sistema?: string | null
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          estado?: string
          estructura_id?: string | null
          id: string
          instalacion_organizacion_id: string
          nivel_id?: string | null
          nombre: string
          orden?: number
          permite_subunidades?: boolean | null
          politica_incorporacion_id?: string | null
          responsable_identidad_ref?: string | null
          tipo_unidad_id: string
          unidad_padre_id?: string | null
        }
        Update: {
          actualizado_en?: string
          codigo?: string | null
          codigo_sistema?: string | null
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          estado?: string
          estructura_id?: string | null
          id?: string
          instalacion_organizacion_id?: string
          nivel_id?: string | null
          nombre?: string
          orden?: number
          permite_subunidades?: boolean | null
          politica_incorporacion_id?: string | null
          responsable_identidad_ref?: string | null
          tipo_unidad_id?: string
          unidad_padre_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_unidad_instalacion_organizacion_id_estructura_id_fkey"
            columns: ["instalacion_organizacion_id", "estructura_id"]
            isOneToOne: false
            referencedRelation: "org_estructura"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
          {
            foreignKeyName: "org_unidad_instalacion_organizacion_id_nivel_id_fkey"
            columns: ["instalacion_organizacion_id", "nivel_id"]
            isOneToOne: false
            referencedRelation: "org_nivel_estructura"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
          {
            foreignKeyName: "org_unidad_instalacion_organizacion_id_politica_incorporac_fkey"
            columns: [
              "instalacion_organizacion_id",
              "politica_incorporacion_id",
            ]
            isOneToOne: false
            referencedRelation: "org_politica_incorporacion"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
          {
            foreignKeyName: "org_unidad_instalacion_organizacion_id_tipo_unidad_id_fkey"
            columns: ["instalacion_organizacion_id", "tipo_unidad_id"]
            isOneToOne: false
            referencedRelation: "org_tipo_unidad"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
          {
            foreignKeyName: "org_unidad_instalacion_organizacion_id_unidad_padre_id_fkey"
            columns: ["instalacion_organizacion_id", "unidad_padre_id"]
            isOneToOne: false
            referencedRelation: "org_unidad"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
        ]
      }
      org_unidad_interes_sugerido: {
        Row: {
          actualizado_en: string
          categoria_id: string
          creado_en: string
          instalacion_organizacion_id: string
          peso: number
          unidad_id: string
        }
        Insert: {
          actualizado_en?: string
          categoria_id: string
          creado_en?: string
          instalacion_organizacion_id: string
          peso?: number
          unidad_id: string
        }
        Update: {
          actualizado_en?: string
          categoria_id?: string
          creado_en?: string
          instalacion_organizacion_id?: string
          peso?: number
          unidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_unidad_interes_sugerido_instalacion_organizacion_id_ca_fkey"
            columns: ["instalacion_organizacion_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "org_categoria_curso"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
          {
            foreignKeyName: "org_unidad_interes_sugerido_instalacion_organizacion_id_un_fkey"
            columns: ["instalacion_organizacion_id", "unidad_id"]
            isOneToOne: false
            referencedRelation: "org_unidad"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
        ]
      }
      org_vinculacion_unidad: {
        Row: {
          actualizado_en: string
          aprobada_por: string | null
          creado_en: string
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          identidad_ref: string
          instalacion_organizacion_id: string
          origen: string
          sede_id: string | null
          tipo: string
          unidad_id: string
        }
        Insert: {
          actualizado_en?: string
          aprobada_por?: string | null
          creado_en?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id: string
          identidad_ref: string
          instalacion_organizacion_id: string
          origen?: string
          sede_id?: string | null
          tipo?: string
          unidad_id: string
        }
        Update: {
          actualizado_en?: string
          aprobada_por?: string | null
          creado_en?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          identidad_ref?: string
          instalacion_organizacion_id?: string
          origen?: string
          sede_id?: string | null
          tipo?: string
          unidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_vinculacion_unidad_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_vinculacion_unidad_instalacion_organizacion_id_unidad__fkey"
            columns: ["instalacion_organizacion_id", "unidad_id"]
            isOneToOne: false
            referencedRelation: "org_unidad"
            referencedColumns: ["instalacion_organizacion_id", "id"]
          },
        ]
      }
      pago_adquisicion_catalogo: {
        Row: {
          actualizado_en: string | null
          clave_idempotencia: string
          confirmado_en: string | null
          estado: Database["public"]["Enums"]["estado_pago_saas"]
          id: string
          iniciado_en: string
          moneda: string
          monto_centavos: number
          operacion_externa_ref: string
          orden_adquisicion_id: string
          proveedor: string
          reembolsado_en: string | null
          respuesta_historica: Json | null
        }
        Insert: {
          actualizado_en?: string | null
          clave_idempotencia: string
          confirmado_en?: string | null
          estado?: Database["public"]["Enums"]["estado_pago_saas"]
          id?: string
          iniciado_en?: string
          moneda: string
          monto_centavos: number
          operacion_externa_ref: string
          orden_adquisicion_id: string
          proveedor: string
          reembolsado_en?: string | null
          respuesta_historica?: Json | null
        }
        Update: {
          actualizado_en?: string | null
          clave_idempotencia?: string
          confirmado_en?: string | null
          estado?: Database["public"]["Enums"]["estado_pago_saas"]
          id?: string
          iniciado_en?: string
          moneda?: string
          monto_centavos?: number
          operacion_externa_ref?: string
          orden_adquisicion_id?: string
          proveedor?: string
          reembolsado_en?: string | null
          respuesta_historica?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pago_adquisicion_catalogo_orden_adquisicion_id_o_eb4dbb98"
            columns: ["orden_adquisicion_id"]
            isOneToOne: false
            referencedRelation: "orden_adquisicion_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      pago_saas: {
        Row: {
          actualizado_en: string | null
          clave_idempotencia: string
          confirmado_en: string | null
          estado: Database["public"]["Enums"]["estado_pago_saas"]
          id: string
          iniciado_en: string
          moneda: string
          monto_centavos: number
          operacion_externa_ref: string
          orden_saas_id: string
          proveedor: string
          reembolsado_en: string | null
          respuesta_historica: Json | null
        }
        Insert: {
          actualizado_en?: string | null
          clave_idempotencia: string
          confirmado_en?: string | null
          estado?: Database["public"]["Enums"]["estado_pago_saas"]
          id?: string
          iniciado_en?: string
          moneda: string
          monto_centavos: number
          operacion_externa_ref: string
          orden_saas_id: string
          proveedor: string
          reembolsado_en?: string | null
          respuesta_historica?: Json | null
        }
        Update: {
          actualizado_en?: string | null
          clave_idempotencia?: string
          confirmado_en?: string | null
          estado?: Database["public"]["Enums"]["estado_pago_saas"]
          id?: string
          iniciado_en?: string
          moneda?: string
          monto_centavos?: number
          operacion_externa_ref?: string
          orden_saas_id?: string
          proveedor?: string
          reembolsado_en?: string | null
          respuesta_historica?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pago_saas_orden_saas_id_orden_saas"
            columns: ["orden_saas_id"]
            isOneToOne: false
            referencedRelation: "orden_saas"
            referencedColumns: ["id"]
          },
        ]
      }
      parametro_tukuy: {
        Row: {
          actualizado_en: string
          clave: string
          configuracion_tukuy_id: string
          descripcion: string | null
          es_publico: boolean
          id: string
          tipo_valor: string
          valor: string
        }
        Insert: {
          actualizado_en?: string
          clave: string
          configuracion_tukuy_id: string
          descripcion?: string | null
          es_publico?: boolean
          id?: string
          tipo_valor: string
          valor: string
        }
        Update: {
          actualizado_en?: string
          clave?: string
          configuracion_tukuy_id?: string
          descripcion?: string | null
          es_publico?: boolean
          id?: string
          tipo_valor?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_parametro_tukuy_configuracion_tukuy_id_configura_df1aa70e"
            columns: ["configuracion_tukuy_id"]
            isOneToOne: false
            referencedRelation: "configuracion_tukuy"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_permiso_principal: {
        Row: {
          concedido_en: string
          perfil_principal_id: string
          permiso_principal_id: string
        }
        Insert: {
          concedido_en?: string
          perfil_principal_id: string
          permiso_principal_id: string
        }
        Update: {
          concedido_en?: string
          perfil_principal_id?: string
          permiso_principal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_permiso_principal_perfil_principal_id_fkey"
            columns: ["perfil_principal_id"]
            isOneToOne: false
            referencedRelation: "perfil_principal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_permiso_principal_permiso_principal_id_fkey"
            columns: ["permiso_principal_id"]
            isOneToOne: false
            referencedRelation: "permiso_principal"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_principal: {
        Row: {
          actualizado_en: string | null
          codigo: string
          creado_en: string
          descripcion: string | null
          es_sistema: boolean
          estado: string
          id: string
          nivel: string
          nombre: string
          portal: string
          version_registro: number
        }
        Insert: {
          actualizado_en?: string | null
          codigo: string
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          estado?: string
          id?: string
          nivel: string
          nombre: string
          portal: string
          version_registro?: number
        }
        Update: {
          actualizado_en?: string | null
          codigo?: string
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          estado?: string
          id?: string
          nivel?: string
          nombre?: string
          portal?: string
          version_registro?: number
        }
        Relationships: []
      }
      perfil_publico_docente: {
        Row: {
          actualizado_en: string
          biografia: string
          cargo: string
          especialidad: string
          experiencia: Json
          foto_url: string | null
          identidad_id: string
        }
        Insert: {
          actualizado_en?: string
          biografia?: string
          cargo?: string
          especialidad?: string
          experiencia?: Json
          foto_url?: string | null
          identidad_id: string
        }
        Update: {
          actualizado_en?: string
          biografia?: string
          cargo?: string
          especialidad?: string
          experiencia?: Json
          foto_url?: string | null
          identidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_publico_docente_identidad_id_fkey"
            columns: ["identidad_id"]
            isOneToOne: true
            referencedRelation: "identidad_principal"
            referencedColumns: ["id"]
          },
        ]
      }
      permiso_principal: {
        Row: {
          actualizado_en: string | null
          codigo: string
          creado_en: string
          descripcion: string | null
          es_sistema: boolean
          estado: string
          id: string
          modulo_codigo: string
          nombre: string
          version_registro: number
        }
        Insert: {
          actualizado_en?: string | null
          codigo: string
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          estado?: string
          id?: string
          modulo_codigo: string
          nombre: string
          version_registro?: number
        }
        Update: {
          actualizado_en?: string | null
          codigo?: string
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          estado?: string
          id?: string
          modulo_codigo?: string
          nombre?: string
          version_registro?: number
        }
        Relationships: []
      }
      plan_saas: {
        Row: {
          actualizado_en: string | null
          codigo: string
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_registro"]
          id: string
          moneda: string
          nombre: string
          periodicidad: Database["public"]["Enums"]["periodicidad_plan"]
          precio_centavos: number
          version_registro: number
        }
        Insert: {
          actualizado_en?: string | null
          codigo: string
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_registro"]
          id?: string
          moneda: string
          nombre: string
          periodicidad: Database["public"]["Enums"]["periodicidad_plan"]
          precio_centavos: number
          version_registro?: number
        }
        Update: {
          actualizado_en?: string | null
          codigo?: string
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_registro"]
          id?: string
          moneda?: string
          nombre?: string
          periodicidad?: Database["public"]["Enums"]["periodicidad_plan"]
          precio_centavos?: number
          version_registro?: number
        }
        Relationships: []
      }
      portal_banner_alumno: {
        Row: {
          activo: boolean
          actualizado_en: string
          badges: Json
          creado_en: string
          cta_texto: string
          cta_url: string | null
          curso_ref: string | null
          etiqueta: string
          filtro_imagen: string
          id: string
          imagen_url: string
          instalacion_organizacion_id: string | null
          orden: number
          subtitulo: string | null
          tipo: string
          titulo: string
          vigencia_desde: string | null
          vigencia_hasta: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          badges?: Json
          creado_en?: string
          cta_texto?: string
          cta_url?: string | null
          curso_ref?: string | null
          etiqueta?: string
          filtro_imagen?: string
          id?: string
          imagen_url?: string
          instalacion_organizacion_id?: string | null
          orden?: number
          subtitulo?: string | null
          tipo?: string
          titulo: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          badges?: Json
          creado_en?: string
          cta_texto?: string
          cta_url?: string | null
          curso_ref?: string | null
          etiqueta?: string
          filtro_imagen?: string
          id?: string
          imagen_url?: string
          instalacion_organizacion_id?: string | null
          orden?: number
          subtitulo?: string | null
          tipo?: string
          titulo?: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_banner_alumno_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_banner_alumno_tipo_fk"
            columns: ["tipo"]
            isOneToOne: false
            referencedRelation: "portal_banner_tipo"
            referencedColumns: ["codigo"]
          },
        ]
      }
      portal_banner_imagen: {
        Row: {
          creado_en: string
          creado_por: string | null
          id: string
          imagen_url: string
          instalacion_organizacion_id: string
          nombre: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          imagen_url: string
          instalacion_organizacion_id: string
          nombre?: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          imagen_url?: string
          instalacion_organizacion_id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_banner_imagen_instalacion_organizacion_id_fkey"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_banner_tipo: {
        Row: {
          activo: boolean
          codigo: string
          descripcion: string
          esquema_campos: Json
          nombre: string
          orden: number
          requiere_curso_ref: boolean
        }
        Insert: {
          activo?: boolean
          codigo: string
          descripcion?: string
          esquema_campos?: Json
          nombre: string
          orden?: number
          requiere_curso_ref?: boolean
        }
        Update: {
          activo?: boolean
          codigo?: string
          descripcion?: string
          esquema_campos?: Json
          nombre?: string
          orden?: number
          requiere_curso_ref?: boolean
        }
        Relationships: []
      }
      provisionamiento_organizacion: {
        Row: {
          cantidad_intentos: number
          clave_idempotencia: string
          datos_proceso: Json | null
          estado: Database["public"]["Enums"]["estado_ejecucion"]
          finalizado_en: string | null
          id: string
          iniciado_en: string | null
          instalacion_organizacion_id: string
          paso_actual: string | null
          siguiente_intento_en: string | null
          solicitado_en: string
          solicitado_por_identidad_ref: string
          tipo: Database["public"]["Enums"]["tipo_provisionamiento"]
          ultimo_error: string | null
        }
        Insert: {
          cantidad_intentos?: number
          clave_idempotencia: string
          datos_proceso?: Json | null
          estado?: Database["public"]["Enums"]["estado_ejecucion"]
          finalizado_en?: string | null
          id?: string
          iniciado_en?: string | null
          instalacion_organizacion_id: string
          paso_actual?: string | null
          siguiente_intento_en?: string | null
          solicitado_en?: string
          solicitado_por_identidad_ref: string
          tipo: Database["public"]["Enums"]["tipo_provisionamiento"]
          ultimo_error?: string | null
        }
        Update: {
          cantidad_intentos?: number
          clave_idempotencia?: string
          datos_proceso?: Json | null
          estado?: Database["public"]["Enums"]["estado_ejecucion"]
          finalizado_en?: string | null
          id?: string
          iniciado_en?: string | null
          instalacion_organizacion_id?: string
          paso_actual?: string | null
          siguiente_intento_en?: string | null
          solicitado_en?: string
          solicitado_por_identidad_ref?: string
          tipo?: Database["public"]["Enums"]["tipo_provisionamiento"]
          ultimo_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_provisionamiento_organizacion_instalacion_organi_571b59c0"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      sesion_soporte_organizacion: {
        Row: {
          aprobada_por_identidad_ref: string
          creada_en: string
          estado: Database["public"]["Enums"]["estado_soporte"]
          expira_en: string
          finalizada_en: string | null
          id: string
          inicia_en: string
          instalacion_organizacion_id: string
          motivo: string
          operador_identidad_ref: string
          permisos_temporales: Json
          ticket_ref: string
        }
        Insert: {
          aprobada_por_identidad_ref: string
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_soporte"]
          expira_en: string
          finalizada_en?: string | null
          id?: string
          inicia_en: string
          instalacion_organizacion_id: string
          motivo: string
          operador_identidad_ref: string
          permisos_temporales: Json
          ticket_ref: string
        }
        Update: {
          aprobada_por_identidad_ref?: string
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_soporte"]
          expira_en?: string
          finalizada_en?: string | null
          id?: string
          inicia_en?: string
          instalacion_organizacion_id?: string
          motivo?: string
          operador_identidad_ref?: string
          permisos_temporales?: Json
          ticket_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sesion_soporte_organizacion_instalacion_organiza_a06d012d"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripcion_organizacion: {
        Row: {
          actualizada_en: string | null
          contrato_externo_ref: string | null
          creada_en: string
          estado: Database["public"]["Enums"]["estado_suscripcion"]
          id: string
          instalacion_organizacion_id: string
          plan_saas_ref: string
          proveedor_pago_ref: string | null
          renovacion_automatica: boolean
          version_registro: number
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          actualizada_en?: string | null
          contrato_externo_ref?: string | null
          creada_en?: string
          estado: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          instalacion_organizacion_id: string
          plan_saas_ref: string
          proveedor_pago_ref?: string | null
          renovacion_automatica?: boolean
          version_registro?: number
          vigente_desde: string
          vigente_hasta?: string | null
        }
        Update: {
          actualizada_en?: string | null
          contrato_externo_ref?: string | null
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          instalacion_organizacion_id?: string
          plan_saas_ref?: string
          proveedor_pago_ref?: string | null
          renovacion_automatica?: boolean
          version_registro?: number
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_suscripcion_organizacion_instalacion_organizacio_dc89d826"
            columns: ["instalacion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "instalacion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_principal: {
        Row: {
          actualizado_en: string | null
          aislamiento: string
          codigo: string
          creado_en: string
          empresa_principal_id: number
          estado: string
          id: string
          nombre: string
          version_registro: number
          zona_horaria: string
        }
        Insert: {
          actualizado_en?: string | null
          aislamiento?: string
          codigo: string
          creado_en?: string
          empresa_principal_id: number
          estado?: string
          id?: string
          nombre: string
          version_registro?: number
          zona_horaria?: string
        }
        Update: {
          actualizado_en?: string | null
          aislamiento?: string
          codigo?: string
          creado_en?: string
          empresa_principal_id?: number
          estado?: string
          id?: string
          nombre?: string
          version_registro?: number
          zona_horaria?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_principal_empresa_principal_id_fkey"
            columns: ["empresa_principal_id"]
            isOneToOne: false
            referencedRelation: "empresa_principal"
            referencedColumns: ["id"]
          },
        ]
      }
      version_esquema_organizacion: {
        Row: {
          cantidad_intentos: number
          conexion_organizacion_id: string
          creada_en: string
          ejecutada_por_identidad_ref: string | null
          estado: Database["public"]["Enums"]["estado_ejecucion"]
          finalizada_en: string | null
          id: number
          iniciada_en: string | null
          ultimo_error: string | null
          version_desde: number
          version_hasta: number
        }
        Insert: {
          cantidad_intentos?: number
          conexion_organizacion_id: string
          creada_en?: string
          ejecutada_por_identidad_ref?: string | null
          estado?: Database["public"]["Enums"]["estado_ejecucion"]
          finalizada_en?: string | null
          id?: number
          iniciada_en?: string | null
          ultimo_error?: string | null
          version_desde: number
          version_hasta: number
        }
        Update: {
          cantidad_intentos?: number
          conexion_organizacion_id?: string
          creada_en?: string
          ejecutada_por_identidad_ref?: string | null
          estado?: Database["public"]["Enums"]["estado_ejecucion"]
          finalizada_en?: string | null
          id?: number
          iniciada_en?: string | null
          ultimo_error?: string | null
          version_desde?: number
          version_hasta?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_version_esquema_organizacion_conexion_organizaci_dea7d594"
            columns: ["conexion_organizacion_id"]
            isOneToOne: false
            referencedRelation: "conexion_organizacion"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _admin_resolver_estado_publicacion: {
        Args: { p_preferidos: string[] }
        Returns: string
      }
      _org_asegurar_modelos_derivados_layout: {
        Args: { p_layout: Json }
        Returns: Json
      }
      _org_backfill_modelos_firmantes: {
        Args: { p_layout: Json }
        Returns: Json
      }
      _org_layout_certificado_default: { Args: never; Returns: Json }
      _org_plantilla_certificado_a_json: {
        Args: {
          p_row: Database["public"]["Tables"]["org_plantilla_certificado"]["Row"]
        }
        Returns: Json
      }
      _org_puede_configurar_certificados: {
        Args: { p_instalacion_id: string }
        Returns: boolean
      }
      _portal_banner_a_json: {
        Args: {
          p_row: Database["public"]["Tables"]["portal_banner_alumno"]["Row"]
        }
        Returns: Json
      }
      _resolver_estado_publico_certificado: {
        Args: { p_preferidos: string[] }
        Returns: string
      }
      admin_actualizar_acceso: {
        Args: {
          p_funcion_id: string
          p_instalacion_ref?: string
          p_perfil_codigo: string
          p_permisos_conceder?: string[]
          p_permisos_denegar?: string[]
        }
        Returns: string
      }
      admin_asignar_acceso: {
        Args: {
          p_correo: string
          p_instalacion_ref?: string
          p_perfil_codigo: string
          p_permisos_conceder?: string[]
          p_permisos_denegar?: string[]
        }
        Returns: string
      }
      admin_cambiar_estado_acceso: {
        Args: { p_estado: string; p_funcion_id: string }
        Returns: undefined
      }
      admin_catalogo_accesos: { Args: never; Returns: Json }
      admin_configurar_conexion_supabase: {
        Args: { p_datos: Json }
        Returns: string
      }
      admin_confirmar_conexion_secundaria:
        | {
            Args: { p_instalacion_id: string; p_version_esquema?: number }
            Returns: undefined
          }
        | {
            Args: {
              p_detalle?: Json
              p_instalacion_id: string
              p_version_esquema?: number
            }
            Returns: Json
          }
      admin_crear_organizacion: { Args: { p_datos: Json }; Returns: Json }
      admin_guardar_configuracion: { Args: { p_datos: Json }; Returns: Json }
      admin_guardar_modulo_organizacion: {
        Args: {
          p_configuracion?: Json
          p_habilitado: boolean
          p_instalacion_id: string
          p_modulo_id: string
        }
        Returns: undefined
      }
      admin_guardar_plan: { Args: { p_datos: Json }; Returns: string }
      admin_guardar_suscripcion: { Args: { p_datos: Json }; Returns: string }
      admin_listar_accesos: {
        Args: never
        Returns: {
          avatar_url: string
          correo: string
          estado_funcion: string
          estado_identidad: string
          funcion_id: string
          identidad_id: string
          instalacion_ref: string
          membresia_id: string
          nivel: string
          nombre: string
          organizacion_nombre: string
          perfil_codigo: string
          perfil_nombre: string
          permisos: string[]
          portal: string
        }[]
      }
      admin_listar_accesos_paginado: {
        Args: {
          p_buscar?: string
          p_nivel?: string
          p_pagina?: number
          p_por_pagina?: number
        }
        Returns: Json
      }
      admin_listar_auditoria: {
        Args: {
          p_buscar?: string
          p_nivel?: string
          p_pagina?: number
          p_por_pagina?: number
        }
        Returns: Json
      }
      admin_listar_cursos_catalogo: {
        Args: { p_instalacion_id?: string }
        Returns: Json
      }
      admin_listar_facturacion: {
        Args: {
          p_buscar?: string
          p_estado?: string
          p_pagina?: number
          p_por_pagina?: number
        }
        Returns: Json
      }
      admin_listar_modulos_organizacion: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      admin_listar_organizaciones_paginado: {
        Args: {
          p_buscar?: string
          p_estado?: string
          p_pagina?: number
          p_plan?: string
          p_por_pagina?: number
        }
        Returns: Json
      }
      admin_listar_organizaciones_paginado_base: {
        Args: {
          p_buscar?: string
          p_estado?: string
          p_pagina?: number
          p_plan?: string
          p_por_pagina?: number
        }
        Returns: Json
      }
      admin_listar_planes_licencias: {
        Args: {
          p_buscar?: string
          p_estado?: string
          p_pagina?: number
          p_por_pagina?: number
        }
        Returns: Json
      }
      admin_obtener_conexion_organizacion: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      admin_obtener_configuracion: { Args: never; Returns: Json }
      admin_obtener_panel_real: { Args: never; Returns: Json }
      admin_revocar_indice_certificado_publico: {
        Args: { p_certificado_secundario_ref: string; p_motivo?: string }
        Returns: Json
      }
      admin_upsert_curso_catalogo_secundaria: {
        Args: {
          p_codigo: string
          p_curso_secundario_ref: string
          p_datos_historicos?: Json
          p_duracion_minutos?: number
          p_estado_publicacion?: string
          p_imagen_publica_ref?: string
          p_instalacion_id: string
          p_modalidad?: string
          p_resumen?: string
          p_titulo: string
          p_version_publicada?: number
        }
        Returns: Json
      }
      admin_upsert_indice_certificado_publico: {
        Args: {
          p_certificado_secundario_ref: string
          p_codigo_verificacion: string
          p_curso_historico: string
          p_documento_secundario_ref: string
          p_emitido_en?: string
          p_estado_publico?: string
          p_huella_documento: string
          p_instalacion_id: string
          p_organizacion_historica: string
          p_titular_historico: string
        }
        Returns: Json
      }
      alumno_listar_banners_portal: {
        Args: { p_instalacion_id?: string }
        Returns: Json
      }
      asegurar_alumno_tukuy_academy: {
        Args: { p_identidad_id: string }
        Returns: string
      }
      asegurar_mi_acceso_alumno_tukuy: { Args: never; Returns: string }
      completar_mi_onboarding_aprendizaje: {
        Args: {
          p_carrera_id: string
          p_interes_ids?: Json
          p_situacion: string
        }
        Returns: Json
      }
      es_super_admin_actual: { Args: never; Returns: boolean }
      identidad_cuenta_guardar: {
        Args: {
          p_fecha_nacimiento?: string
          p_nombre?: string
          p_preferencias?: Json
          p_telefono?: string
        }
        Returns: Json
      }
      identidad_cuenta_mia: { Args: never; Returns: Json }
      listar_catalogo_onboarding_aprendizaje: { Args: never; Returns: Json }
      listar_tipos_banner_portal: { Args: never; Returns: Json }
      obtener_mi_onboarding_aprendizaje: { Args: never; Returns: Json }
      obtener_mis_contextos: {
        Args: never
        Returns: {
          alcance: Json
          ambito_docencia: string
          empresa_principal_ref: number
          empresa_sistema_ref: string
          funcion_id: string
          instalacion_organizacion_ref: string
          membresia_id: string
          organizacion_nombre: string
          permisos: string[]
          portal: string
          rol_codigo: string
          rol_id: string
          tenant_ref: string
          usuario_id: string
          version_autorizacion: number
        }[]
      }
      org_activar_incorporacion: {
        Args: {
          p_aprobada_por?: string
          p_identidad_id: string
          p_instalacion_id: string
        }
        Returns: Json
      }
      org_aplicar_excepciones_a_funcion: {
        Args: {
          p_funcion_id: string
          p_identidad_ref: string
          p_instalacion_id: string
        }
        Returns: undefined
      }
      org_asegurar_config_certificados: {
        Args: { p_instalacion_id: string }
        Returns: undefined
      }
      org_asegurar_organigrama_base: {
        Args: { p_instalacion_id: string }
        Returns: undefined
      }
      org_asegurar_perfiles_base: {
        Args: { p_instalacion_id: string }
        Returns: undefined
      }
      org_asegurar_presencia_base: {
        Args: { p_instalacion_id: string }
        Returns: undefined
      }
      org_asignar_acceso: {
        Args: {
          p_correo: string
          p_instalacion_id: string
          p_perfil_codigo: string
        }
        Returns: string
      }
      org_cambiar_estado_acceso: {
        Args: {
          p_estado: string
          p_funcion_id: string
          p_instalacion_id: string
        }
        Returns: undefined
      }
      org_catalogo_perfiles: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_categoria_a_json: {
        Args: {
          p_row: Database["public"]["Tables"]["org_categoria_curso"]["Row"]
        }
        Returns: Json
      }
      org_codigo_funcion_org_perfil: {
        Args: { p_perfil_id: string }
        Returns: string
      }
      org_eliminar_asignacion: {
        Args: { p_asignacion_id: string; p_instalacion_id: string }
        Returns: Json
      }
      org_eliminar_asignacion_perfil: {
        Args: { p_asignacion_id: string; p_instalacion_id: string }
        Returns: Json
      }
      org_eliminar_banner_portal: {
        Args: { p_banner_id: string; p_instalacion_id: string }
        Returns: Json
      }
      org_eliminar_categoria_curso: {
        Args: { p_categoria_id: string; p_instalacion_id: string }
        Returns: Json
      }
      org_eliminar_curso_catalogo_permanente: {
        Args: { p_curso_secundario_ref: string; p_instalacion_id: string }
        Returns: Json
      }
      org_eliminar_excepcion_permiso: {
        Args: { p_excepcion_id: string; p_instalacion_id: string }
        Returns: Json
      }
      org_eliminar_fondo_certificado: {
        Args: { p_fondo_id: string; p_instalacion_id: string }
        Returns: Json
      }
      org_eliminar_plantilla_certificado: {
        Args: { p_instalacion_id: string; p_plantilla_id: string }
        Returns: Json
      }
      org_eliminar_regla_acceso: {
        Args: { p_instalacion_id: string; p_regla_id: string }
        Returns: Json
      }
      org_eliminar_ruta: {
        Args: { p_instalacion_id: string; p_ruta_id: string }
        Returns: Json
      }
      org_eliminar_sede: {
        Args: { p_instalacion_id: string; p_sede_id: string }
        Returns: Json
      }
      org_eliminar_unidad: {
        Args: { p_instalacion_id: string; p_unidad_id: string }
        Returns: Json
      }
      org_eliminar_vinculacion: {
        Args: { p_instalacion_id: string; p_vinculacion_id: string }
        Returns: Json
      }
      org_es_miembro_instalacion: {
        Args: { p_instalacion_id: string }
        Returns: boolean
      }
      org_guardar_asignacion: {
        Args: { p_asignacion: Json; p_instalacion_id: string }
        Returns: Json
      }
      org_guardar_asignacion_perfil: {
        Args: { p_asignacion: Json; p_instalacion_id: string }
        Returns: Json
      }
      org_guardar_categoria_curso: {
        Args: { p_categoria: Json; p_instalacion_id: string }
        Returns: Json
      }
      org_guardar_estructura: {
        Args: { p_estructura: Json; p_instalacion_id: string }
        Returns: Json
      }
      org_guardar_excepcion_permiso: {
        Args: { p_excepcion: Json; p_instalacion_id: string }
        Returns: Json
      }
      org_guardar_intereses_sugeridos_unidad: {
        Args: {
          p_categoria_ids?: Json
          p_instalacion_id: string
          p_unidad_id: string
        }
        Returns: Json
      }
      org_guardar_nivel: {
        Args: { p_instalacion_id: string; p_nivel: Json }
        Returns: Json
      }
      org_guardar_perfil: {
        Args: { p_instalacion_id: string; p_perfil: Json }
        Returns: Json
      }
      org_guardar_politica_incorporacion: {
        Args: { p_instalacion_id: string; p_politica: Json }
        Returns: Json
      }
      org_guardar_presencia: {
        Args: { p_instalacion_id: string; p_presencia: Json }
        Returns: Json
      }
      org_guardar_regla_acceso: {
        Args: { p_instalacion_id: string; p_regla: Json }
        Returns: Json
      }
      org_guardar_ruta: {
        Args: { p_instalacion_id: string; p_ruta: Json }
        Returns: Json
      }
      org_guardar_sede: {
        Args: { p_instalacion_id: string; p_sede: Json }
        Returns: Json
      }
      org_guardar_tipo_unidad: {
        Args: { p_instalacion_id: string; p_tipo: Json }
        Returns: Json
      }
      org_guardar_unidad: {
        Args: { p_instalacion_id: string; p_unidad: Json }
        Returns: Json
      }
      org_guardar_vinculacion: {
        Args: { p_instalacion_id: string; p_vinculacion: Json }
        Returns: Json
      }
      org_incorporar_persona_perfil: {
        Args: {
          p_correo: string
          p_instalacion_id: string
          p_perfil_org_id: string
          p_sede_id?: string
          p_unidad_id?: string
        }
        Returns: Json
      }
      org_listar_alertas_operativas: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_alumnos: {
        Args: {
          p_busqueda?: string
          p_instalacion_id: string
          p_limite?: number
          p_offset?: number
        }
        Returns: Json
      }
      org_listar_asignaciones_rutas: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_banners_portal: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_categorias_catalogo: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_categorias_cursos: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_cursos_catalogo: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_cursos_perfil_publico: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_excepciones_permiso: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_fondos_certificado: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_imagenes_banners_portal: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_intereses_sugeridos_unidad: {
        Args: { p_instalacion_id: string; p_unidad_id?: string }
        Returns: Json
      }
      org_listar_miembros: { Args: { p_instalacion_id: string }; Returns: Json }
      org_listar_organigrama: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_listar_perfiles: { Args: { p_instalacion_id: string }; Returns: Json }
      org_listar_presencias_publicas: { Args: never; Returns: Json }
      org_listar_sedes_reglas: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_marcar_plantilla_certificado_default: {
        Args: { p_instalacion_id: string; p_plantilla_id: string }
        Returns: Json
      }
      org_normalizar_codigo_permiso: {
        Args: { p_codigo: string }
        Returns: string
      }
      org_obtener_config_certificados: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_obtener_licencia: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_obtener_plantilla_certificado_default: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_obtener_presencia: {
        Args: { p_instalacion_id: string }
        Returns: Json
      }
      org_ocultar_curso_catalogo: {
        Args: {
          p_curso_secundario_ref: string
          p_datos_historicos?: Json
          p_instalacion_id: string
        }
        Returns: Json
      }
      org_plantilla_a_perfil_codigo: {
        Args: { p_plantilla: string }
        Returns: string
      }
      org_presencia_a_json: {
        Args: { p_row: Database["public"]["Tables"]["org_presencia"]["Row"] }
        Returns: Json
      }
      org_puede_gestionar_accesos: {
        Args: { p_instalacion_id: string }
        Returns: boolean
      }
      org_registrar_fondo_certificado: {
        Args: {
          p_fondo_url: string
          p_instalacion_id: string
          p_nombre?: string
        }
        Returns: Json
      }
      org_registrar_imagen_banner_portal: {
        Args: {
          p_imagen_url: string
          p_instalacion_id: string
          p_nombre?: string
        }
        Returns: Json
      }
      org_reordenar_banners_portal: {
        Args: { p_ids: string[]; p_instalacion_id: string }
        Returns: Json
      }
      org_resolver_estudiante_secundaria: {
        Args: { p_identidad_id: string; p_instalacion_id: string }
        Returns: Json
      }
      org_set_docentes_config_certificados: {
        Args: { p_instalacion_id: string; p_permitir: boolean }
        Returns: Json
      }
      org_sincronizar_funcion_desde_asignacion: {
        Args: { p_asignacion_id: string; p_instalacion_id: string }
        Returns: string
      }
      org_sincronizar_responsable_gobierno: {
        Args: { p_instalacion_id: string; p_unidad_id: string }
        Returns: string
      }
      org_solicitar_ingreso_comunidad: {
        Args: { p_dni?: string; p_instalacion_id: string }
        Returns: Json
      }
      org_tiene_permiso: {
        Args: { p_instalacion_id: string; p_permiso: string }
        Returns: boolean
      }
      org_upsert_banner_portal: {
        Args: { p_banner: Json; p_instalacion_id: string }
        Returns: Json
      }
      org_upsert_curso_catalogo: {
        Args: {
          p_codigo?: string
          p_curso_secundario_ref: string
          p_datos_historicos?: Json
          p_duracion_minutos?: number
          p_estado_publicacion?: string
          p_imagen_publica_ref?: string
          p_instalacion_id: string
          p_modalidad?: string
          p_resumen?: string
          p_titulo?: string
          p_version_publicada?: number
        }
        Returns: Json
      }
      org_upsert_plantilla_certificado: {
        Args: { p_instalacion_id: string; p_plantilla: Json }
        Returns: Json
      }
      perfil_docente_guardar: {
        Args: {
          p_biografia?: string
          p_cargo?: string
          p_especialidad?: string
          p_experiencia?: Json
          p_foto_url?: string
          p_nombre?: string
        }
        Returns: Json
      }
      perfil_docente_mio: { Args: never; Returns: Json }
      perfil_docente_publico: {
        Args: { p_auth_usuario_ref: string }
        Returns: Json
      }
      permisos_efectivos_funcion: {
        Args: { p_funcion_id: string }
        Returns: string[]
      }
      verificar_certificado_publico: {
        Args: { p_codigo: string }
        Returns: Json
      }
    }
    Enums: {
      estado_adquisicion:
        | "PENDIENTE"
        | "ACTIVA"
        | "VENCIDA"
        | "CANCELADA"
        | "REVOCADA"
      estado_certificado_publico:
        | "VIGENTE"
        | "REVOCADO"
        | "REEMPLAZADO"
        | "NO_DISPONIBLE"
      estado_conexion:
        | "PENDIENTE"
        | "APROVISIONANDO"
        | "ACTIVA"
        | "MIGRANDO"
        | "SUSPENDIDA"
        | "ERROR"
        | "ELIMINACION_PROGRAMADA"
      estado_ejecucion:
        | "PENDIENTE"
        | "EJECUTANDO"
        | "COMPLETADA"
        | "ERROR"
        | "CANCELADA"
      estado_instalacion:
        | "PENDIENTE"
        | "PROVISIONANDO"
        | "ACTIVA"
        | "SUSPENDIDA"
        | "CANCELADA"
        | "ELIMINACION_PROGRAMADA"
        | "ERROR"
      estado_orden_saas:
        | "PENDIENTE"
        | "PAGO_INICIADO"
        | "PAGADA"
        | "CANCELADA"
        | "EXPIRADA"
        | "REEMBOLSADA"
      estado_pago_saas:
        | "PENDIENTE"
        | "PROCESANDO"
        | "CONFIRMADO"
        | "RECHAZADO"
        | "ANULADO"
        | "REEMBOLSADO"
      estado_procesamiento_evento:
        | "PENDIENTE"
        | "PROCESANDO"
        | "PROCESADO"
        | "ERROR"
        | "DESCARTADO"
      estado_publicacion_catalogo:
        | "BORRADOR"
        | "EN_REVISION"
        | "PUBLICADO"
        | "RETIRADO"
        | "CONTENIDO_REVISADO"
        | "OBSERVADO"
        | "APROBADO"
      estado_registro: "ACTIVO" | "INACTIVO" | "SUSPENDIDO" | "ELIMINADO"
      estado_soporte:
        | "SOLICITADA"
        | "APROBADA"
        | "ACTIVA"
        | "EXPIRADA"
        | "CERRADA"
        | "REVOCADA"
      estado_suscripcion:
        | "PRUEBA"
        | "ACTIVA"
        | "VENCIDA"
        | "SUSPENDIDA"
        | "CANCELADA"
      origen_evento_externo:
        | "ACCESOS_PRINCIPAL"
        | "BASE_SECUNDARIA"
        | "PROVEEDOR_PAGO"
        | "PROVEEDOR_FIRMA"
      periodicidad_plan: "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL"
      resultado_auditoria: "EXITOSO" | "DENEGADO" | "ERROR"
      tipo_oferta_catalogo: "GRATUITA" | "COMPRA" | "SUSCRIPCION" | "CONVENIO"
      tipo_provisionamiento:
        | "CREAR_BASE"
        | "APLICAR_MIGRACIONES"
        | "CARGAR_DATOS_INICIALES"
        | "ROTAR_CREDENCIALES"
        | "SUSPENDER_BASE"
        | "REACTIVAR_BASE"
        | "ELIMINAR_BASE"
        | "RESTAURAR_BASE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_adquisicion: [
        "PENDIENTE",
        "ACTIVA",
        "VENCIDA",
        "CANCELADA",
        "REVOCADA",
      ],
      estado_certificado_publico: [
        "VIGENTE",
        "REVOCADO",
        "REEMPLAZADO",
        "NO_DISPONIBLE",
      ],
      estado_conexion: [
        "PENDIENTE",
        "APROVISIONANDO",
        "ACTIVA",
        "MIGRANDO",
        "SUSPENDIDA",
        "ERROR",
        "ELIMINACION_PROGRAMADA",
      ],
      estado_ejecucion: [
        "PENDIENTE",
        "EJECUTANDO",
        "COMPLETADA",
        "ERROR",
        "CANCELADA",
      ],
      estado_instalacion: [
        "PENDIENTE",
        "PROVISIONANDO",
        "ACTIVA",
        "SUSPENDIDA",
        "CANCELADA",
        "ELIMINACION_PROGRAMADA",
        "ERROR",
      ],
      estado_orden_saas: [
        "PENDIENTE",
        "PAGO_INICIADO",
        "PAGADA",
        "CANCELADA",
        "EXPIRADA",
        "REEMBOLSADA",
      ],
      estado_pago_saas: [
        "PENDIENTE",
        "PROCESANDO",
        "CONFIRMADO",
        "RECHAZADO",
        "ANULADO",
        "REEMBOLSADO",
      ],
      estado_procesamiento_evento: [
        "PENDIENTE",
        "PROCESANDO",
        "PROCESADO",
        "ERROR",
        "DESCARTADO",
      ],
      estado_publicacion_catalogo: [
        "BORRADOR",
        "EN_REVISION",
        "PUBLICADO",
        "RETIRADO",
        "CONTENIDO_REVISADO",
        "OBSERVADO",
        "APROBADO",
      ],
      estado_registro: ["ACTIVO", "INACTIVO", "SUSPENDIDO", "ELIMINADO"],
      estado_soporte: [
        "SOLICITADA",
        "APROBADA",
        "ACTIVA",
        "EXPIRADA",
        "CERRADA",
        "REVOCADA",
      ],
      estado_suscripcion: [
        "PRUEBA",
        "ACTIVA",
        "VENCIDA",
        "SUSPENDIDA",
        "CANCELADA",
      ],
      origen_evento_externo: [
        "ACCESOS_PRINCIPAL",
        "BASE_SECUNDARIA",
        "PROVEEDOR_PAGO",
        "PROVEEDOR_FIRMA",
      ],
      periodicidad_plan: ["MENSUAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"],
      resultado_auditoria: ["EXITOSO", "DENEGADO", "ERROR"],
      tipo_oferta_catalogo: ["GRATUITA", "COMPRA", "SUSCRIPCION", "CONVENIO"],
      tipo_provisionamiento: [
        "CREAR_BASE",
        "APLICAR_MIGRACIONES",
        "CARGAR_DATOS_INICIALES",
        "ROTAR_CREDENCIALES",
        "SUSPENDER_BASE",
        "REACTIVAR_BASE",
        "ELIMINAR_BASE",
        "RESTAURAR_BASE",
      ],
    },
  },
} as const
